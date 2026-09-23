import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";
import { randomBytes } from "node:crypto";

// Run only by the verified owner in the production environment. Input is one
// value per line: username, name, email, temporary password.
const input = await new Promise<string>((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
  process.stdin.on("error", reject);
});
const [username, name, email, password] = input.split(/\r?\n/).map((value) => value.trim());
if (!username || !name || !email || !password || password.length < 12 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
  throw new Error("Expected username, name, email, and a temporary password of at least 12 characters on stdin");
}
const [existingAdmin] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "administrator")).limit(1);
if (existingAdmin) throw new Error("An administrator already exists; bootstrap is a one-time operation");
const [user] = await db.insert(usersTable).values({
  id: randomBytes(16).toString("hex"), username: username.toLowerCase(), name, email,
  role: "administrator", passwordHash: await hashPassword(password), passwordChangeRequired: true,
}).returning({ id: usersTable.id });
process.stderr.write(`Created administrator ${user.id}. Credentials were not retained.\n`);