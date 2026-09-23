import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { db, pool, usersTable, sessionsTable, portalMediaTable } from "@workspace/db";
import { ObjectStorageService } from "./lib/objectStorage.ts";
import { hashToken } from "./lib/auth.ts";

if (process.env.NODE_ENV !== "test" || !new URL(process.env.DATABASE_URL ?? "postgres://invalid/invalid").pathname.match(/^\/portal_test_[0-9a-f]{16}$/)) {
  throw new Error("Refusing to run portal fixtures outside a disposable portal_test database");
}

// No object storage calls: image bytes and upload targets exist only in memory.
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489", "hex");
const uploads = new Map();
ObjectStorageService.prototype.getObjectEntityUploadTarget = async () => {
  const path = `/objects/portal-test/${randomUUID()}`;
  uploads.set(path, png);
  return { objectPath: path, uploadURL: "https://example.invalid/test-only-upload" };
};
ObjectStorageService.prototype.verifyUploadedMedia = async (path) => {
  assert.ok(uploads.has(path), "only synthetic test images may be confirmed");
  return { contentType: "image/png", size: png.length };
};
ObjectStorageService.prototype.copyToImmutableObject = async (path) => {
  assert.ok(uploads.has(path));
  const immutable = `/objects/portal-test/immutable-${randomUUID()}`;
  uploads.set(immutable, Buffer.from(uploads.get(path)));
  return immutable;
};
ObjectStorageService.prototype.getObjectEntityFile = async (path) => {
  if (!uploads.has(path)) throw new Error("Synthetic image not found");
  return path;
};
ObjectStorageService.prototype.downloadObject = async (path) =>
  new Response(uploads.get(path), { headers: { "Content-Type": "image/png" } });

const { default: app } = await import("./app.ts");

function client(base, cookie = "") {
  return async (path, method = "GET", json) => {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { ...(cookie ? { cookie } : {}), ...(json !== undefined ? { "content-type": "application/json" } : {}) },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
    const type = response.headers.get("content-type") ?? "";
    return { status: response.status, body: type.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer()), headers: response.headers };
  };
}
function status(result, expected) {
  assert.equal(result.status, expected, JSON.stringify(result.body));
  return result.body;
}
const text = (body) => [{ id: randomUUID(), type: "text", heading: "Test only", body }];

test("portal editor keeps drafts, photos and previews private through publish and unpublish", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const open = client(base);
  const identities = [];
  const token = () => randomBytes(32).toString("hex");
  async function actor(role) {
    const id = `portal-test-${role}-${randomUUID()}`;
    const session = token();
    await db.insert(usersTable).values({ id, username: id, role });
    await db.insert(sessionsTable).values({ userId: id, tokenHash: hashToken(session), expiresAt: new Date(Date.now() + 60_000) });
    identities.push(id);
    return client(base, `incesc_session=${session}`);
  }
  try {
    const content = await actor("content");
    const admin = await actor("administrator");
    const auditor = await actor("auditor");
    const outsider = await actor("financial");
    const settingsPath = "/admin/portal/settings";
    const footer = (footerInstitutional) => ({ footerInstitutional, officialLinks: [], contact: {} });
    status(await open(settingsPath), 401);
    status(await outsider(settingsPath), 403);
    status(await auditor(settingsPath, "PATCH", { expectedVersion: 1, draft: footer("Draft") }), 403);
    let settings = status(await content(settingsPath, "PATCH", { expectedVersion: 1, draft: footer("Draft") }), 200);
    assert.notEqual(status(await open("/public/portal/settings"), 200).footerInstitutional, "Draft");
    status(await content(`${settingsPath}/publish`, "POST", { expectedVersion: settings.version }), 403);
    settings = status(await admin(`${settingsPath}/publish`, "POST", { expectedVersion: settings.version }), 200);
    assert.equal(status(await open("/public/portal/settings"), 200).footerInstitutional, "Draft");
    status(await content(settingsPath, "PATCH", { expectedVersion: 1, draft: footer("Stale") }), 409);
    settings = status(await content(settingsPath, "PATCH", { expectedVersion: settings.version, draft: footer("New draft") }), 200);
    assert.equal(status(await open("/public/portal/settings"), 200).footerInstitutional, "Draft");

    const slug = `portal-test-${randomBytes(6).toString("hex")}`;
    const path = "/admin/portal/pages";
    status(await open(path), 401);
    status(await outsider(path), 403);
    status(await auditor(path, "POST", { slug, title: "Test", blocks: [] }), 403);
    const page = status(await content(path, "POST", { slug, title: "Test", blocks: text("Draft one") }), 201);
    const pagePath = `${path}/${page.id}`;
    assert.equal(page.status, "draft");
    status(await open(`/public/portal/pages/${slug}`), 404);
    assert.equal(status(await open("/public/portal/pages"), 200).some((p) => p.slug === slug), false);
    status(await open(pagePath), 401); // the preview UI requests this endpoint
    status(await outsider(pagePath), 403);
    assert.equal(status(await auditor(pagePath), 200).blocks[0].body, "Draft one");
    assert.equal(status(await content(pagePath), 200).blocks[0].body, "Draft one");
    status(await content(`${pagePath}/publish`, "POST", { expectedVersion: page.version }), 403);
    status(await auditor(`${pagePath}/publish`, "POST", { expectedVersion: page.version }), 403);
    status(await outsider(`${pagePath}/unpublish`, "POST", { expectedVersion: page.version }), 403);

    const upload = status(await content("/admin/portal/media/upload-url", "POST",
      { name: "synthetic.png", size: png.length, contentType: "image/png" }), 201);
    assert.equal(new URL(upload.uploadURL).hostname, "example.invalid");
    assert.equal(status(await content("/admin/portal/media"), 200).find((m) => m.id === upload.id).objectPath, undefined);
    status(await open(`/public/portal/media/${upload.id}`), 404);
    status(await open(`/admin/portal/media/${upload.id}`), 401);
    status(await content(`/admin/portal/media/${upload.id}`), 404);
    status(await admin(`/admin/portal/media/${upload.id}/confirm`, "POST", { altText: "Synthetic" }), 404);
    const image = { id: randomUUID(), type: "image", mediaId: upload.id };
    let draft = status(await content(pagePath, "PATCH",
      { slug, title: "Test", blocks: [...text("Draft one"), image], expectedVersion: page.version }), 200);
    status(await admin(`${pagePath}/publish`, "POST", { expectedVersion: draft.version }), 400);
    status(await open(`/public/portal/media/${upload.id}`), 404);
    status(await content(`/admin/portal/media/${upload.id}/confirm`, "POST", { altText: "Synthetic test image" }), 200);
    status(await content(`/admin/portal/media/${upload.id}/confirm`, "POST", { altText: "Change" }), 409);
    status(await open(`/public/portal/media/${upload.id}`), 404);
    assert.deepEqual(status(await content(`/admin/portal/media/${upload.id}`), 200), png);
    status(await outsider(`/admin/portal/media/${upload.id}`), 403);
    const published = status(await admin(`${pagePath}/publish`, "POST", { expectedVersion: draft.version }), 200);
    assert.equal(published.status, "published");
    assert.equal(status(await open(`/public/portal/pages/${slug}`), 200).media[0].id, upload.id);
    assert.deepEqual(status(await open(`/public/portal/media/${upload.id}`), 200), png);
    assert.equal(status(await open("/public/portal/pages"), 200).some((p) => p.slug === slug), true);

    draft = status(await content(pagePath, "PATCH",
      { slug, title: "Test new draft", blocks: text("Not public yet"), expectedVersion: published.version }), 200);
    assert.equal(status(await content(pagePath), 200).blocks[0].body, "Not public yet");
    const publicSnapshot = status(await open(`/public/portal/pages/${slug}`), 200);
    assert.equal(publicSnapshot.blocks[0].body, "Draft one");
    assert.equal(publicSnapshot.media[0].id, upload.id);
    status(await content(pagePath, "PATCH", { expectedVersion: published.version, title: "Stale" }), 409);
    status(await admin(`${pagePath}/publish`, "POST", { expectedVersion: published.version }), 409);
    status(await admin(`${pagePath}/unpublish`, "POST", { expectedVersion: published.version }), 409);
    assert.equal(status(await content(pagePath), 200).version, draft.version);

    const unpublished = status(await admin(`${pagePath}/unpublish`, "POST", { expectedVersion: draft.version }), 200);
    assert.equal(unpublished.status, "draft");
    status(await open(`/public/portal/pages/${slug}`), 404);
    status(await open(`/public/portal/media/${upload.id}`), 404);
    assert.equal(status(await open("/public/portal/pages"), 200).some((p) => p.slug === slug), false);

    for (const [core, system] of [["home", "actions"], ["transparencia", "transparency"], ["minha-jornada", "journey"]]) {
      const block = { id: randomUUID(), type: "system", system };
      status(await content(path, "POST", { slug: core, title: "Test", blocks: [] }), 409);
      status(await content(path, "POST", { slug: core, title: "Test", blocks: [{ ...block, system: "actions" }] }), system === "actions" ? 201 : 409);
      if (system !== "actions") {
        const corePage = status(await content(path, "POST", { slug: core, title: "Test", blocks: [block] }), 201);
        status(await content(`${path}/${corePage.id}`, "PATCH", { blocks: [], expectedVersion: corePage.version }), 409);
      }
    }
    status(await content(pagePath, "PATCH", { blocks: [{ id: randomUUID(), type: "system", system: "actions" }], expectedVersion: unpublished.version }), 409);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});