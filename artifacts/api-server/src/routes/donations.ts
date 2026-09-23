import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Readable } from "node:stream";
import { db, donationActionsTable, donationsTable, expensesTable, usersTable, auditLogsTable, objectUploadIntentsTable } from "@workspace/db";
import {
  CreateAdminActionBody, CreateAdminExpenseBody, CreateDonationCheckoutBody,
  GetCheckoutStatusResponse, GetMeResponse,
  ListPublicActionsResponse, ListPublicTransparencyResponse,
  ListMyDonationsResponse, ListAdminActionsResponse, ListAdminDonationsResponse,
  ListAdminExpensesResponse, ListAdminUsersResponse, ListAdminAuditLogsResponse,
} from "@workspace/api-zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { z } from "zod";

const router: IRouter = Router();
const staffRoles = new Set(["administrator", "financial", "content", "transparency", "auditor", "support"]);
const objectStorage = new ObjectStorageService();
const actionUpdateSchema = z.object({
  slug: z.string().min(1).optional(), title: z.string().min(1).optional(),
  category: z.string().min(1).optional(), publicDescription: z.string().optional(),
  internalDescription: z.string().nullable().optional(), goalCents: z.number().int().min(1).nullable().optional(),
  suggestedAmounts: z.array(z.number().int().min(1)).optional(), status: z.string().optional(),
}).strict();
const roleSchema = z.enum(["unassigned", "administrator", "financial", "content", "transparency", "auditor", "support"]);
function expenseResponse(e: typeof expensesTable.$inferSelect) {
  return { id: e.id, actionId: e.actionId, description: e.publicDescription ?? "[redacted]", category: e.category,
    amountCents: e.amountCents, paidAt: e.paidAt, publicReceiptPath: e.status === "published" && e.reviewedReceiptPath ? `/api/public/receipts/${e.id}` : null,
    status: e.status, originalReceiptPath: e.originalReceiptPath, reviewedReceiptPath: e.reviewedReceiptPath };
}

function clerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth.userId ?? null;
}

async function currentUser(req: Request) {
  const id = clerkUserId(req);
  if (!id) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (user) return user;
  // JIT provisioning is deliberately unassigned; it can never grant staff access.
  const [created] = await db.insert(usersTable).values({ id }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(usersTable).where(eq(usersTable.id, id)))[0] ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!clerkUserId(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function requireRoles(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!user.active || !staffRoles.has(user.role) || (roles.length > 0 && !roles.includes(user.role))) {
    res.status(403).json({ error: "Staff role required. An owner must grant a role after verifying identity." });
    return;
  }
  next();
  };
}

async function actionTotals(ids: string[]) {
  if (!ids.length) return new Map<string, { raised: number; used: number }>();
  const paid = await db.select({
    actionId: donationsTable.actionId,
    total: sql<number>`coalesce(sum(${donationsTable.amountCents}), 0)`,
  }).from(donationsTable).where(and(inArray(donationsTable.actionId, ids), eq(donationsTable.paymentStatus, "paid"))).groupBy(donationsTable.actionId);
  const used = await db.select({
    actionId: expensesTable.actionId,
    total: sql<number>`coalesce(sum(${expensesTable.amountCents}), 0)`,
  }).from(expensesTable).where(and(inArray(expensesTable.actionId, ids), eq(expensesTable.status, "published"))).groupBy(expensesTable.actionId);
  const result = new Map<string, { raised: number; used: number }>();
  ids.forEach((id) => result.set(id, { raised: 0, used: 0 }));
  paid.forEach((row) => result.get(row.actionId)!.raised = Number(row.total));
  used.forEach((row) => result.get(row.actionId)!.used = Number(row.total));
  return result;
}

router.get("/public/actions", async (_req, res): Promise<void> => {
  const actions = await db.select().from(donationActionsTable).where(eq(donationActionsTable.status, "published")).orderBy(desc(donationActionsTable.createdAt));
  const totals = await actionTotals(actions.map((a) => a.id));
  const data = actions.map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category, publicDescription: a.publicDescription, goalCents: a.goalCents, suggestedAmounts: a.suggestedAmounts, raisedCents: totals.get(a.id)!.raised, status: a.status }));
  res.json(ListPublicActionsResponse.parse(data));
});

router.get("/public/transparency", async (_req, res): Promise<void> => {
  const actions = await db.select().from(donationActionsTable).where(inArray(donationActionsTable.status, ["published", "funded", "executing", "completed"]));
  const totals = await actionTotals(actions.map((a) => a.id));
  const published = actions.length ? await db.select().from(expensesTable).where(and(inArray(expensesTable.actionId, actions.map((a) => a.id)), eq(expensesTable.status, "published"))) : [];
  const data = actions.map((a) => {
    const t = totals.get(a.id)!;
    return { id: a.id, slug: a.slug, title: a.title, category: a.category, publicDescription: a.publicDescription, goalCents: a.goalCents, suggestedAmounts: a.suggestedAmounts, raisedCents: t.raised, status: a.status, paidCents: t.raised, usedCents: t.used, balanceCents: t.raised - t.used,
      expenses: published.filter((e) => e.actionId === a.id).map((e) => ({ id: e.id, description: e.publicDescription ?? "[Expense]", category: e.category, amountCents: e.amountCents, paidAt: e.paidAt, publicReceiptPath: e.reviewedReceiptPath ? `/api/public/receipts/${e.id}` : null })) };
  });
  res.json(ListPublicTransparencyResponse.parse(data));
});

router.get("/public/checkout-status", (_req, res) => {
  res.json(GetCheckoutStatusResponse.parse({ available: false, reason: "Nenhum provedor de pagamento aprovado está conectado ao INCESC." }));
});

router.get("/public/receipts/:id", async (req, res): Promise<void> => {
  const [expense] = await db.select().from(expensesTable).where(and(eq(expensesTable.id, req.params.id as string), eq(expensesTable.status, "published")));
  if (!expense?.reviewedReceiptPath) { res.status(404).json({ error: "Receipt not found" }); return; }
  try {
    const file = await objectStorage.getObjectEntityFile(expense.reviewedReceiptPath);
    const response = await objectStorage.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${expense.id}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Receipt not found" }); return; }
    req.log.error({ err: error }, "Error serving reviewed receipt");
    res.status(500).json({ error: "Failed to serve receipt" });
  }
});

router.post("/public/donations/create-checkout", (req, res) => {
  const parsed = CreateDonationCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid checkout request" }); return; }
  res.status(503).json({ error: "Checkout indisponível: nenhum provedor de pagamento aprovado está conectado." });
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  res.json(GetMeResponse.parse({ userId: user.id, role: user.active ? user.role : "unassigned" }));
});

router.get("/me/donations", requireAuth, async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user || !user.active) { res.status(403).json({ error: "Account inactive" }); return; }
  const rows = await db.select().from(donationsTable).where(and(eq(donationsTable.donorUserId, user.id), eq(donationsTable.paymentStatus, "paid"))).orderBy(desc(donationsTable.createdAt));
  res.json(ListMyDonationsResponse.parse(rows.map((d) => ({ id: d.id, actionId: d.actionId, amountCents: d.amountCents, paymentStatus: d.paymentStatus, createdAt: d.createdAt, paidAt: d.paidAt }))));
});

router.post("/admin/storage/uploads/request-url", requireRoles("administrator", "financial", "content"), async (req, res): Promise<void> => {
  const { name, size, contentType, purpose, expenseId } = req.body ?? {};
  if (typeof name !== "string" || !Number.isInteger(size) || size <= 0 || typeof contentType !== "string") {
    res.status(400).json({ error: "name, positive integer size and contentType are required" }); return;
  }
  if (size > 25 * 1024 * 1024 || !contentType.startsWith("image/") && contentType !== "application/pdf") {
    res.status(400).json({ error: "Only PDF or image receipts up to 25MB are accepted" }); return;
  }
  if (purpose !== "original" && purpose !== "reviewed") { res.status(400).json({ error: "purpose must be original or reviewed" }); return; }
  if (!["application/pdf", "image/png", "image/jpeg"].includes(contentType)) {
    res.status(400).json({ error: "Only PDF, PNG, and JPEG receipts are accepted" }); return;
  }
  const owner = await currentUser(req);
  if (!owner) { res.status(401).json({ error: "Authentication required" }); return; }
  if (purpose === "reviewed") {
    if (typeof expenseId !== "string") { res.status(400).json({ error: "expenseId is required for reviewed uploads" }); return; }
    const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId));
    if (!expense || expense.createdBy === owner.id) { res.status(403).json({ error: "Only a different reviewer may upload a reviewed receipt" }); return; }
  } else if (expenseId !== undefined) {
    res.status(400).json({ error: "expenseId is only valid for reviewed uploads" }); return;
  }
  try {
    const target = await objectStorage.getObjectEntityUploadTarget();
    await db.insert(objectUploadIntentsTable).values({ objectPath: target.objectPath, ownerUserId: owner.id, expenseId: purpose === "reviewed" ? expenseId : null, purpose, declaredContentType: contentType, declaredSize: size });
    res.json({ uploadURL: target.uploadURL, objectPath: target.objectPath, purpose, expenseId: expenseId ?? null, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating private receipt upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});
router.get("/admin/dashboard", requireRoles("administrator", "financial", "auditor"), async (_req, res): Promise<void> => {
  const [raised] = await db.select({ total: sql<number>`coalesce(sum(${donationsTable.amountCents}), 0)` }).from(donationsTable).where(eq(donationsTable.paymentStatus, "paid"));
  const [donations] = await db.select({ total: sql<number>`count(*)` }).from(donationsTable);
  const [active] = await db.select({ total: sql<number>`count(*)` }).from(donationActionsTable).where(inArray(donationActionsTable.status, ["published", "funded", "executing"]));
  const [completed] = await db.select({ total: sql<number>`count(*)` }).from(donationActionsTable).where(eq(donationActionsTable.status, "completed"));
  const [pending] = await db.select({ total: sql<number>`count(*)` }).from(donationsTable).where(eq(donationsTable.paymentStatus, "pending"));
  const [receipts] = await db.select({ total: sql<number>`count(*)` }).from(expensesTable).where(eq(expensesTable.status, "pending_review"));
  res.json({ totalRaisedCents: Number(raised.total), totalDonations: Number(donations.total), activeActions: Number(active.total), completedActions: Number(completed.total), pendingPayments: Number(pending.total), receiptsAwaitingReview: Number(receipts.total) });
});

router.get("/admin/actions", requireRoles("administrator", "content", "auditor"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(donationActionsTable).orderBy(desc(donationActionsTable.createdAt));
  const totals = await actionTotals(rows.map((a) => a.id));
  res.json(ListAdminActionsResponse.parse(rows.map((a) => ({ ...a, raisedCents: totals.get(a.id)!.raised }))));
});
router.post("/admin/actions", requireRoles("administrator", "content"), async (req, res): Promise<void> => {
  const parsed = CreateAdminActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await currentUser(req); if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  const [row] = await db.insert(donationActionsTable).values({ ...parsed.data, status: "draft", createdBy: user.id }).returning();
  res.status(201).json({ ...row, raisedCents: 0 });
});
router.patch("/admin/actions/:id", requireRoles("administrator", "content"), async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const parsed = actionUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid action update" }); return; }
  const user = await currentUser(req); if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  const [before] = await db.select().from(donationActionsTable).where(eq(donationActionsTable.id, id));
  if (!before) { res.status(404).json({ error: "Action not found" }); return; }
  if (parsed.data.status !== undefined && parsed.data.status !== before.status && before.createdBy === user.id) {
    res.status(403).json({ error: "A separate staff member must approve state transitions" }); return;
  }
  const [row] = await db.update(donationActionsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(donationActionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Action not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: user.id, entityType: "donation_action", entityId: id, action: parsed.data.status !== undefined && parsed.data.status !== before.status ? "state_transition_approved" : "updated", metadata: parsed.data });
  const totals = await actionTotals([row.id]);
  res.json({ ...row, raisedCents: totals.get(row.id)!.raised });
});

router.get("/admin/donations", requireRoles("administrator", "financial", "auditor"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(donationsTable).orderBy(desc(donationsTable.createdAt));
  res.json(ListAdminDonationsResponse.parse(rows));
});
router.get("/admin/expenses", requireRoles("administrator", "financial", "transparency", "auditor"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(expensesTable).orderBy(desc(expensesTable.createdAt));
  res.json(ListAdminExpensesResponse.parse(rows.map(expenseResponse)));
});
router.post("/admin/expenses", requireRoles("administrator", "financial"), async (req, res): Promise<void> => {
  const parsed = CreateAdminExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.originalReceiptPath && !parsed.data.originalReceiptPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Original receipt must be a private object path" }); return;
  }
  if (parsed.data.reviewedReceiptPath) {
    res.status(400).json({ error: "Reviewed receipts require the separate review workflow" }); return;
  }
  let actual: { contentType: string; size: number } | undefined;
  if (parsed.data.originalReceiptPath) {
    try { actual = await objectStorage.verifyUploadedReceipt(parsed.data.originalReceiptPath, "original"); }
    catch (error) {
      if (error instanceof ObjectNotFoundError) { res.status(400).json({ error: "Original receipt object does not exist" }); return; }
      res.status(400).json({ error: "Original receipt failed type, magic-byte, or size validation" }); return;
    }
  }
  const user = await currentUser(req); if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  if (parsed.data.originalReceiptPath) {
    const [intent] = await db.update(objectUploadIntentsTable).set({ status: "consumed", consumedAt: new Date() })
      .where(and(eq(objectUploadIntentsTable.objectPath, parsed.data.originalReceiptPath), eq(objectUploadIntentsTable.ownerUserId, user.id), eq(objectUploadIntentsTable.purpose, "original"), eq(objectUploadIntentsTable.declaredContentType, actual!.contentType), eq(objectUploadIntentsTable.declaredSize, actual!.size), eq(objectUploadIntentsTable.status, "issued"))).returning();
    if (!intent) { res.status(400).json({ error: "Original receipt was not issued by this server for this user" }); return; }
  }
  const [row] = await db.insert(expensesTable).values({ ...parsed.data, createdBy: user.id }).returning();
  await db.insert(auditLogsTable).values({ userId: user.id, entityType: "expense", entityId: row.id, action: "created" });
  res.status(201).json(expenseResponse(row));
});

router.post("/admin/expenses/:id/review", requireRoles("administrator", "financial", "transparency"), async (req, res): Promise<void> => {
  const reviewer = await currentUser(req);
  if (!reviewer) { res.status(401).json({ error: "Authentication required" }); return; }
  const parsed = z.object({ reviewedReceiptPath: z.string().startsWith("/objects/"), publicDescription: z.string().min(1), redactedAttestation: z.literal(true) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A reviewed private receipt path and explicit public description are required" }); return; }
  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, req.params.id as string));
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  if (expense.createdBy === reviewer.id) { res.status(403).json({ error: "A second user must review the expense" }); return; }
  if (parsed.data.reviewedReceiptPath === expense.originalReceiptPath) { res.status(400).json({ error: "Reviewed receipt must differ from the original" }); return; }
  let actual: { contentType: string; size: number };
  try { actual = await objectStorage.verifyUploadedReceipt(parsed.data.reviewedReceiptPath, "reviewed"); }
  catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(400).json({ error: "Reviewed receipt object does not exist" }); return; }
    res.status(400).json({ error: "Reviewed receipt failed type, magic-byte, or size validation" }); return;
  }
  const [intent] = await db.update(objectUploadIntentsTable).set({ status: "consumed", consumedAt: new Date() })
    .where(and(eq(objectUploadIntentsTable.objectPath, parsed.data.reviewedReceiptPath), eq(objectUploadIntentsTable.ownerUserId, reviewer.id), eq(objectUploadIntentsTable.expenseId, expense.id), eq(objectUploadIntentsTable.purpose, "reviewed"), eq(objectUploadIntentsTable.declaredContentType, actual!.contentType), eq(objectUploadIntentsTable.declaredSize, actual!.size), eq(objectUploadIntentsTable.status, "issued"))).returning();
  if (!intent) { res.status(400).json({ error: "Reviewed receipt was not issued for this reviewer and expense" }); return; }
  const [updated] = await db.update(expensesTable).set({ reviewedReceiptPath: parsed.data.reviewedReceiptPath, publicDescription: parsed.data.publicDescription, reviewedBy: reviewer.id, status: "approved", updatedAt: new Date() }).where(eq(expensesTable.id, expense.id)).returning();
  await db.insert(auditLogsTable).values({ userId: reviewer.id, entityType: "expense", entityId: expense.id, action: "reviewed" });
  res.json(expenseResponse(updated));
});

router.post("/admin/expenses/:id/publish", requireRoles("administrator", "transparency"), async (req, res): Promise<void> => {
  const publisher = await currentUser(req);
  if (!publisher) { res.status(401).json({ error: "Authentication required" }); return; }
  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, req.params.id as string));
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  if (expense.createdBy === publisher.id || expense.reviewedBy === publisher.id) { res.status(403).json({ error: "A separate reviewer and publisher are required" }); return; }
  if (expense.status !== "approved" || !expense.reviewedReceiptPath) { res.status(400).json({ error: "Expense must have an approved reviewed receipt" }); return; }
  const [updated] = await db.update(expensesTable).set({ status: "published", publishedBy: publisher.id, updatedAt: new Date() }).where(eq(expensesTable.id, expense.id)).returning();
  await db.insert(auditLogsTable).values({ userId: publisher.id, entityType: "expense", entityId: expense.id, action: "published" });
  res.json(expenseResponse(updated));
});

router.get("/admin/users", requireRoles("administrator"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(ListAdminUsersResponse.parse(rows));
});
router.patch("/admin/users/:id/role", requireRoles("administrator"), async (req, res): Promise<void> => {
  const parsed = z.object({ role: roleSchema }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid role" }); return; }
  const actor = await currentUser(req);
  if (!actor || actor.id === req.params.id) { res.status(403).json({ error: "An administrator cannot change their own role" }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id as string));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  const [updated] = await db.update(usersTable).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(usersTable.id, target.id)).returning();
  await db.insert(auditLogsTable).values({ userId: actor.id, entityType: "user", entityId: target.id, action: "role_changed", metadata: { from: target.role, to: parsed.data.role } });
  res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, active: updated.active });
});
router.get("/admin/audit-logs", requireRoles("administrator", "auditor"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
  res.json(ListAdminAuditLogsResponse.parse(rows));
});

export default router;