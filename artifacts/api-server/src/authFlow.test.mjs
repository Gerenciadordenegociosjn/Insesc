import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { db, pendingLoginTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Run against the development API through the shared proxy:
// pnpm --filter @workspace/api-server exec tsx --test src/authFlow.test.mjs
const base = "http://localhost:80/api";

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits -= 8)) & 255);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest.at(-1) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

function client() {
  const cookies = new Map();
  return async (path, method = "GET", payload) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        origin: "http://localhost:80",
        ...(payload ? { "content-type": "application/json" } : {}),
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    for (const raw of response.headers.getSetCookie()) {
      const [name, value] = raw.split(";", 1)[0].split("=", 2);
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
}

function expectStatus(result, status) {
  assert.equal(result.status, status);
  return result.body;
}

test("temporary-password sessions cannot compete with MFA enrollment or replay a code", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Development database only");
  assert.notEqual(process.env.REPLIT_DEPLOYMENT, "1", "Never run on a deployment");
  const id = `auth_smoke_${randomBytes(12).toString("hex")}`;
  const initialPassword = randomBytes(24).toString("base64url");
  const permanentPassword = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("base64")}$${scryptSync(initialPassword, salt, 64).toString("base64")}`;
  const owner = client();
  const competing = client();
  const otherEnrollment = client();
  let inserted = false;

  try {
    await db.insert(usersTable).values({
      id, username: id, role: "unassigned", passwordHash: hash, passwordChangeRequired: true,
    });
    inserted = true;

    assert.equal(expectStatus(await owner("/auth/login", "POST", { username: id, password: initialPassword }), 200).next, "password");
    assert.equal(expectStatus(await competing("/auth/login", "POST", { username: id, password: initialPassword }), 200).next, "password");
    expectStatus(await owner("/auth/password", "POST", { password: permanentPassword }), 200);

    // Every cookie issued under the temporary password must now be unusable.
    assert.notEqual((await competing("/auth/password", "POST", { password: permanentPassword })).status, 200);
    expectStatus(await competing("/auth/totp/setup", "POST"), 401);
    expectStatus(await competing("/auth/totp/verify", "POST", { code: "123456" }), 401);
    expectStatus(await competing("/auth/login", "POST", { username: id, password: initialPassword }), 401);

    // An MFA-stage cookie must not be able to change the password.
    assert.notEqual((await owner("/auth/password", "POST", { password: initialPassword })).status, 200);
    assert.equal(expectStatus(await otherEnrollment("/auth/login", "POST", { username: id, password: permanentPassword }), 200).next, "setup");
    const first = expectStatus(await owner("/auth/totp/setup", "POST"), 200);
    const second = expectStatus(await otherEnrollment("/auth/totp/setup", "POST"), 200);
    assert.equal(expectStatus(await owner("/auth/totp/setup", "POST"), 200).secret, first.secret, "Setup retry must preserve its key");
    assert.notEqual(first.secret, second.secret, "Independent pending logins must have independent keys");

    const [firstVerification, secondVerification] = await Promise.all([
      owner("/auth/totp/verify", "POST", { code: totp(first.secret) }),
      otherEnrollment("/auth/totp/verify", "POST", { code: totp(second.secret) }),
    ]);
    assert.deepEqual([firstVerification.status, secondVerification.status].sort(), [200, 401], "Exactly one enrollment may succeed");
    const winner = firstVerification.status === 200 ? owner : otherEnrollment;
    const loser = firstVerification.status === 200 ? otherEnrollment : owner;
    const winningSecret = firstVerification.status === 200 ? first.secret : second.secret;
    const losingSecret = firstVerification.status === 200 ? second.secret : first.secret;
    expectStatus(await winner("/admin/users"), 403);
    expectStatus(await loser("/auth/totp/verify", "POST", { code: totp(losingSecret) }), 401);
    const fresh = client();
    assert.equal(expectStatus(await fresh("/auth/login", "POST", { username: id, password: permanentPassword }), 200).next, "totp");
    expectStatus(await fresh("/auth/totp/setup", "POST"), 401);
    expectStatus(await fresh("/auth/totp/verify", "POST", { code: totp(winningSecret) }), 401);

    const [user] = await db.select({ secret: usersTable.totpSecret, step: usersTable.totpLastStep }).from(usersTable).where(eq(usersTable.id, id));
    assert.ok(user.secret?.includes("."), "Enrolled TOTP key must be encrypted");
    assert.notEqual(user.secret, winningSecret);
    assert.ok(user.step !== null, "A successful code must record the replay step");
    const pending = await db.select({ tokenHash: pendingLoginTable.tokenHash }).from(pendingLoginTable).where(eq(pendingLoginTable.userId, id));
    assert.equal(pending.length, 1, "Only the fresh login's pending MFA token may remain");
  } finally {
    if (inserted) await db.delete(usersTable).where(eq(usersTable.id, id));
  }
});