import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, createHmac, createCipheriv, createDecipheriv } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, pendingLoginTable, sessionsTable, usersTable } from "@workspace/db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "incesc_session";
export const PENDING_COOKIE = "incesc_pending";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64")}$${digest.toString("base64")}`;
}
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  if (!encoded?.startsWith("scrypt$")) return false;
  try {
    const [, saltText, digestText] = encoded.split("$");
    const salt = Buffer.from(saltText, "base64");
    const expected = Buffer.from(digestText, "base64");
    const actual = await scrypt(password, salt, expected.length) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
export function hashToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function newToken(): string { return randomBytes(32).toString("base64url"); }
function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for TOTP encryption");
  return createHash("sha256").update(secret).digest();
}
export function encryptTotpSecret(value: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}
export function decryptTotpSecret(value: string | null): string | null {
  if (!value) return null;
  try {
    const [ivText, ciphertextText, tagText] = value.split(".");
    if (!ivText || !ciphertextText || !tagText) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
  } catch { return null; }
}

export async function userFromSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const [row] = await db.select({ user: usersTable }).from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.tokenHash, hashToken(token)), gt(sessionsTable.expiresAt, new Date())));
  return row?.user ?? null;
}
export function setCookie(res: Response, name: string, value: string, maxAge: number): void {
  res.cookie(name, value, { ...cookieOptions, maxAge });
}
export function clearCookie(res: Response, name: string): void { res.clearCookie(name, cookieOptions); }
export async function establishSession(res: Response, userId: string): Promise<void> {
  const token = newToken();
  await db.insert(sessionsTable).values({ tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) });
  setCookie(res, SESSION_COOKIE, token, 8 * 60 * 60 * 1000);
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newTotpSecret(): string {
  let out = "";
  let bits = 0, value = 0;
  for (const byte of randomBytes(20)) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits -= 5)) & 31]; } }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(input: string): Buffer {
  let bits = 0, value = 0; const bytes: number[] = [];
  for (const char of input.replace(/=+$/, "").toUpperCase()) { const n = alphabet.indexOf(char); if (n < 0) throw new Error("Invalid secret"); value = (value << 5) | n; bits += 5; if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); } }
  return Buffer.from(bytes);
}
export function totpCode(secret: string, counter: number): string {
  const key = base32Decode(secret); const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buf).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
export function validTotp(secret: string, code: string, lastStep: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(Date.now() / 30000);
  for (let delta = -1; delta <= 1; delta++) { const step = current + delta; if (step > (lastStep ?? -1) && timingSafeEqual(Buffer.from(totpCode(secret, step)), Buffer.from(code))) return step; }
  return null;
}