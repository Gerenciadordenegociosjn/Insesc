import { Router, type IRouter } from "express";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db, auditLogsTable, pendingLoginTable, sessionsTable, usersTable } from "@workspace/db";
import { z } from "zod";
import { clearCookie, decryptTotpSecret, encryptTotpSecret, hashPassword, hashToken, newToken, newTotpSecret, PENDING_COOKIE, SESSION_COOKIE, setCookie, userFromSession, validTotp } from "../lib/auth";

const router: IRouter = Router();
const attempts = new Map<string, { count: number; reset: number }>();
function allowed(ip: string, account = ""): boolean {
  const key = `${ip}:${account}`; const now = Date.now(); const a = attempts.get(key);
  if (!a || a.reset < now) { if (attempts.size > 10000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k); attempts.set(key, { count: 1, reset: now + 60_000 }); return true; }
  a.count++; return a.count <= 10;
}
async function pendingUser(req: any) {
  const token = req.cookies?.[PENDING_COOKIE]; if (!token) return null;
  const [row] = await db.select({ user: usersTable, tokenHash: pendingLoginTable.tokenHash, stage: pendingLoginTable.stage, totpEnrollmentSecret: pendingLoginTable.totpEnrollmentSecret }).from(pendingLoginTable)
    .innerJoin(usersTable, eq(usersTable.id, pendingLoginTable.userId)).where(and(eq(pendingLoginTable.tokenHash, hashToken(token)), gt(pendingLoginTable.expiresAt, new Date())));
  return row ?? null;
}
async function createPending(res: any, userId: string, stage: "password" | "mfa" = "mfa") {
  const token = newToken();
  await db.insert(pendingLoginTable).values({ tokenHash: hashToken(token), userId, stage, expiresAt: new Date(Date.now() + 10 * 60_000) });
  setCookie(res, PENDING_COOKIE, token, 10 * 60_000);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = z.object({ username: z.string().min(1), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Username and password are required" }); return; }
  if (!allowed(req.ip ?? "unknown", parsed.data.username.toLowerCase())) { res.status(429).json({ error: "Too many login attempts" }); return; }
  const { verifyPassword } = await import("../lib/auth");
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.username, parsed.data.username.toLowerCase())).for("update");
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (!user || !ok || !user.active) return null;
    const token = newToken();
    await tx.insert(pendingLoginTable).values({ tokenHash: hashToken(token), userId: user.id, stage: user.passwordChangeRequired ? "password" : "mfa", expiresAt: new Date(Date.now() + 10 * 60_000) });
    return { user, token };
  });
  if (!result) { res.status(401).json({ error: "Invalid credentials" }); return; }
  setCookie(res, PENDING_COOKIE, result.token, 10 * 60_000);
  const user = result.user;
  res.json({ next: user.passwordChangeRequired ? "password" : user.totpSecret ? "totp" : "setup" });
});

router.post("/auth/password", async (req, res): Promise<void> => {
  const pendingToken = req.cookies?.[PENDING_COOKIE]; const password = req.body?.password;
  if (!pendingToken) { res.status(401).json({ error: "Password change is not required" }); return; }
  if (typeof password !== "string" || password.length < 12) { res.status(400).json({ error: "Password must contain at least 12 characters" }); return; }
  const passwordHash = await hashPassword(password);
  const changed = await db.transaction(async (tx) => {
    const [candidate] = await tx.select({ userId: pendingLoginTable.userId }).from(pendingLoginTable)
      .where(eq(pendingLoginTable.tokenHash, hashToken(pendingToken)));
    if (!candidate) return null;
    const [user] = await tx.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, candidate.userId)).for("update");
    if (!user) return null;
    const [pending] = await tx.select().from(pendingLoginTable)
      .where(and(eq(pendingLoginTable.tokenHash, hashToken(pendingToken)), eq(pendingLoginTable.stage, "password"), gt(pendingLoginTable.expiresAt, new Date()))).for("update");
    if (!pending || pending.userId !== user.id) return null;
    const [updated] = await tx.update(usersTable).set({ passwordHash, passwordChangeRequired: false, updatedAt: new Date() })
      .where(and(eq(usersTable.id, pending.userId), eq(usersTable.passwordChangeRequired, true), eq(usersTable.active, true))).returning({ id: usersTable.id, totpSecret: usersTable.totpSecret });
    if (!updated) return null;
    await tx.delete(pendingLoginTable).where(eq(pendingLoginTable.userId, pending.userId));
    return { updated, userId: pending.userId };
  });
  if (!changed) { res.status(409).json({ error: "Password was already changed; start a new login" }); return; }
  await createPending(res, changed.userId, "mfa");
  res.json({ next: changed.updated.totpSecret ? "totp" : "setup" });
});

router.post("/auth/totp/setup", async (req, res): Promise<void> => {
  const pending = await pendingUser(req);
  if (!pending || pending.stage !== "mfa" || pending.user.totpSecret || pending.user.passwordChangeRequired) { res.status(401).json({ error: "Fresh password login required" }); return; }
  const user = pending.user; const secret = decryptTotpSecret(pending.totpEnrollmentSecret) ?? newTotpSecret();
  await db.update(pendingLoginTable).set({ totpEnrollmentSecret: encryptTotpSecret(secret) })
    .where(eq(pendingLoginTable.tokenHash, pending.tokenHash));
  const issuer = "INCESC"; const label = encodeURIComponent(`${issuer}:${user.email ?? user.id}`);
  res.json({ secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
});

router.post("/auth/totp/verify", async (req, res): Promise<void> => {
  const pendingToken = req.cookies?.[PENDING_COOKIE];
  if (!pendingToken) { res.status(401).json({ error: "Login verification expired" }); return; }
  if (!allowed(req.ip ?? "unknown", hashToken(pendingToken))) { res.status(429).json({ error: "Too many verification attempts" }); return; }
  const result = await db.transaction(async (tx) => {
    const [candidate] = await tx.select({ userId: pendingLoginTable.userId }).from(pendingLoginTable)
      .where(eq(pendingLoginTable.tokenHash, hashToken(pendingToken)));
    if (!candidate) return null;
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, candidate.userId)).for("update");
    if (!user || !user.active || user.passwordChangeRequired) return null;
    const [pending] = await tx.select().from(pendingLoginTable)
      .where(and(eq(pendingLoginTable.tokenHash, hashToken(pendingToken)), eq(pendingLoginTable.stage, "mfa"), gt(pendingLoginTable.expiresAt, new Date()))).for("update");
    if (!pending || pending.userId !== user.id) return null;
    const secret = pending.totpEnrollmentSecret ? decryptTotpSecret(pending.totpEnrollmentSecret) : decryptTotpSecret(user.totpSecret);
    if (!secret) return null;
    const step = validTotp(secret, String(req.body?.code ?? ""), user.totpLastStep);
    if (step === null) return null;
    const [updated] = await tx.update(usersTable).set({ ...(pending.totpEnrollmentSecret ? { totpSecret: encryptTotpSecret(secret) } : {}), totpLastStep: step, updatedAt: new Date() })
      .where(and(eq(usersTable.id, user.id), or(isNull(usersTable.totpLastStep), lt(usersTable.totpLastStep, step)), ...(pending.totpEnrollmentSecret ? [isNull(usersTable.totpSecret)] : []))).returning({ id: usersTable.id });
    if (!updated) return null;
    await tx.delete(pendingLoginTable).where(eq(pendingLoginTable.userId, user.id));
    const sessionToken = newToken();
    await tx.insert(sessionsTable).values({ tokenHash: hashToken(sessionToken), userId: user.id, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) });
    return { user, sessionToken };
  });
  if (!result) { res.status(401).json({ error: "Invalid or replayed code" }); return; }
  setCookie(res, SESSION_COOKIE, result.sessionToken, 8 * 60 * 60 * 1000); clearCookie(res, PENDING_COOKIE);
  res.json({ userId: result.user.id, role: result.user.role });
});
router.post("/auth/logout", async (req, res): Promise<void> => {
  const session = req.cookies?.incesc_session; const pending = req.cookies?.[PENDING_COOKIE];
  if (session) await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(session)));
  if (pending) await db.delete(pendingLoginTable).where(eq(pendingLoginTable.tokenHash, hashToken(pending)));
  clearCookie(res, "incesc_session"); clearCookie(res, PENDING_COOKIE); res.status(204).end();
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const actor = await userFromSession(req);
  if (!actor || actor.role !== "administrator" || !actor.active) { res.status(403).json({ error: "Administrator role required" }); return; }
  const parsed = z.object({ username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/), name: z.string().optional(), email: z.string().email().optional(), role: z.enum(["unassigned", "administrator", "financial", "content", "transparency", "auditor", "support"]) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid user details" }); return; }
  const temporaryPassword = newToken().slice(0, 20);
  try {
    const [user] = await db.insert(usersTable).values({ id: newToken(), username: parsed.data.username.toLowerCase(), name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash: await hashPassword(temporaryPassword), passwordChangeRequired: true }).returning();
    await db.insert(auditLogsTable).values({ userId: actor.id, entityType: "user", entityId: user.id, action: "created", metadata: { username: user.username, role: user.role } });
    res.status(201).json({ user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, active: user.active }, temporaryPassword });
  } catch { res.status(409).json({ error: "Username or email already exists" }); }
});
export default router;