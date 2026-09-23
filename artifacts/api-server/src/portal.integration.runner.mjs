import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pool } from "@workspace/db";

// Always create a separate, disposable database. Never run the suite through the
// shared proxy or against a pre-existing portal database.
if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Portal integration tests require a development DATABASE_URL and cannot run in a deployment");
}
const source = new URL(process.env.DATABASE_URL);
if (!source.pathname || source.pathname === "/") throw new Error("DATABASE_URL must name a database");
const database = `portal_test_${randomBytes(8).toString("hex")}`;
const isolated = new URL(source);
isolated.pathname = `/${database}`;
// pg options can override search_path and route queries outside the isolated DB.
isolated.searchParams.delete("options");
const env = {
  ...process.env,
  DATABASE_URL: isolated.toString(),
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  // Storage is stubbed inside the child. No real bucket is accessed.
  PRIVATE_OBJECT_DIR: "",
  PUBLIC_OBJECT_SEARCH_PATHS: "",
};
let created = false;
try {
  await pool.query(`CREATE DATABASE "${database}"`);
  created = true;
  const schema = spawnSync("pnpm", ["--filter", "@workspace/db", "run", "push-force"], {
    cwd: new URL("../../../", import.meta.url), env, stdio: "inherit",
  });
  if (schema.error || schema.status !== 0) throw schema.error ?? new Error("Could not initialize isolated schema");
  const tests = spawnSync("pnpm", ["--filter", "@workspace/api-server", "exec", "tsx", "--test", "src/portal.integration.test.mjs"], {
    cwd: new URL("../../../", import.meta.url), env, stdio: "inherit",
  });
  if (tests.error || tests.status !== 0) throw tests.error ?? new Error("Portal integration suite failed");
} finally {
  if (created) {
    await pool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [database]);
    await pool.query(`DROP DATABASE "${database}"`);
  }
  await pool.end();
}