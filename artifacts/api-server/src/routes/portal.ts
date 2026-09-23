import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, auditLogsTable, donationActionsTable, portalMediaTable, portalPagesTable, portalSettingsTable } from "@workspace/db";
import { portalBlocksSchema, portalMediaConfirmSchema, portalMediaUploadSchema, portalPageInputSchema, portalSettingsSchema, type PortalBlockValue } from "@workspace/api-zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { userFromSession } from "../lib/auth";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const reserved = new Set(["home", "transparencia", "minha-jornada"]);
const readRoles = ["administrator", "content", "auditor"];
const editRoles = ["administrator", "content"];
const publishRoles = ["administrator"];

async function user(req: Request) { return userFromSession(req); }
function roles(...allowed: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const current = await user(req);
    if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
    if (!current.active || !allowed.includes(current.role)) { res.status(403).json({ error: "Insufficient portal permission" }); return; }
    res.setHeader("Cache-Control", "private, no-store");
    next();
  };
}
function pageResponse(row: typeof portalPagesTable.$inferSelect, draft = true) {
  return { id: row.id, slug: row.slug, title: row.title, blocks: (draft ? row.draftBlocks : row.publishedBlocks) ?? [], status: row.status, version: row.version, publishedAt: row.publishedAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
function mediaIds(blocks: unknown): string[] {
  const result: string[] = [];
  if (!Array.isArray(blocks)) return result;
  for (const block of blocks as PortalBlockValue[]) {
    const candidate = block as Record<string, unknown>;
    for (const key of ["mediaId", "imageId", "backgroundImageId"]) if (typeof candidate[key] === "string") result.push(candidate[key] as string);
    if ("mediaIds" in block && Array.isArray(block.mediaIds)) result.push(...block.mediaIds);
  }
  return result;
}
function validCore(slug: string, blocks: PortalBlockValue[]): boolean {
  const expected = slug === "home" ? "actions" : slug === "transparencia" ? "transparency" : slug === "minha-jornada" ? "journey" : null;
  if (!expected) return blocks.every((b) => b.type !== "system");
  return blocks.filter((b) => b.type === "system" && b.system === expected).length === 1 &&
    blocks.filter((b) => b.type === "system").length === 1;
}
async function validatePublish(blocks: unknown): Promise<string | null> {
  const parsed = portalBlocksSchema.safeParse(blocks);
  if (!parsed.success) return "Invalid blocks";
  const ids = [...new Set(mediaIds(parsed.data))];
  if (!ids.length) return null;
  const rows = await db.select().from(portalMediaTable);
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of ids) {
    const media = byId.get(id);
    if (!media || media.status !== "confirmed" || !media.altText?.trim()) return `Media ${id} must be confirmed with alt text`;
  }
  return null;
}

router.get("/public/portal/pages/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [row] = await db.select().from(portalPagesTable).where(and(eq(portalPagesTable.slug, slug), eq(portalPagesTable.status, "published")));
  if (!row || !row.publishedBlocks) { res.status(404).json({ error: "Published page not found" }); return; }
  const ids = [...new Set(mediaIds(row.publishedBlocks))];
  const media = ids.length ? await db.select().from(portalMediaTable) : [];
  const visibleMedia = media.filter((m) => ids.includes(m.id) && m.status === "confirmed" && m.altText).map((m) => ({ id: m.id, altText: m.altText, contentType: m.contentType, url: `/api/public/portal/media/${m.id}` }));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.json({ ...pageResponse(row, false), media: visibleMedia });
});
router.get("/public/portal/pages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(portalPagesTable).where(eq(portalPagesTable.status, "published")).orderBy(desc(portalPagesTable.updatedAt));
  res.json(rows.filter((r) => !reserved.has(r.slug)).map((r) => ({ id: r.id, slug: r.slug, title: r.title })));
});
router.get("/public/portal/settings", async (_req, res): Promise<void> => {
  const [row] = await db.select().from(portalSettingsTable).where(eq(portalSettingsTable.id, 1));
  res.json(row?.published ?? { footerInstitutional: "", officialLinks: [], contact: {} });
});
router.get("/public/portal/media/:id", async (req, res): Promise<void> => {
  const [media] = await db.select().from(portalMediaTable).where(and(eq(portalMediaTable.id, String(req.params.id)), eq(portalMediaTable.status, "confirmed")));
  if (!media) { res.status(404).json({ error: "Media not found" }); return; }
  const pages = await db.select({ blocks: portalPagesTable.publishedBlocks }).from(portalPagesTable).where(eq(portalPagesTable.status, "published"));
  if (!pages.some((p) => mediaIds(p.blocks).includes(media.id))) { res.status(404).json({ error: "Media not found" }); return; }
  try {
    const response = await storage.downloadObject(await storage.getObjectEntityFile(media.objectPath));
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (response.body) { const { Readable } = await import("node:stream"); Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else res.end();
  } catch (error) { if (error instanceof ObjectNotFoundError) res.status(404).json({ error: "Media not found" }); else res.status(500).json({ error: "Unable to serve media" }); }
});

router.get("/admin/portal/pages", roles(...readRoles), async (_req, res): Promise<void> => {
  const rows = await db.select().from(portalPagesTable).orderBy(desc(portalPagesTable.updatedAt));
  res.json(rows.map((r) => pageResponse(r)));
});
router.post("/admin/portal/pages", roles(...editRoles), async (req, res): Promise<void> => {
  const parsed = portalPageInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (reserved.has(parsed.data.slug) && !validCore(parsed.data.slug, parsed.data.blocks)) { res.status(409).json({ error: "Reserved core slug requires its matching system block" }); return; }
  const [pathCollision] = await db.select({ id: donationActionsTable.id }).from(donationActionsTable).where(eq(donationActionsTable.slug, parsed.data.slug));
  if (pathCollision) { res.status(409).json({ error: "Slug collides with an existing route" }); return; }
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const [row] = await db.insert(portalPagesTable).values({ slug: parsed.data.slug, title: parsed.data.title, draftBlocks: parsed.data.blocks, createdBy: current.id, updatedBy: current.id }).returning();
    await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_page", entityId: row.id, action: "created" });
    res.status(201).json(pageResponse(row));
  } catch (error: any) { if (error?.code === "23505") res.status(409).json({ error: "Slug already exists" }); else res.status(500).json({ error: "Unable to create page" }); }
});
router.get("/admin/portal/pages/:id", roles(...readRoles), async (req, res): Promise<void> => {
  const [row] = await db.select().from(portalPagesTable).where(eq(portalPagesTable.id, String(req.params.id)));
  if (!row) { res.status(404).json({ error: "Page not found" }); return; }
  res.json(pageResponse(row));
});
router.patch("/admin/portal/pages/:id", roles(...editRoles), async (req, res): Promise<void> => {
  const parsed = portalPageInputSchema.partial().required({ expectedVersion: true }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  const [before] = await db.select().from(portalPagesTable).where(eq(portalPagesTable.id, String(req.params.id)));
  if (!before) { res.status(404).json({ error: "Page not found" }); return; }
  const finalSlug = parsed.data.slug ?? before.slug;
  const finalBlocks = (parsed.data.blocks ?? before.draftBlocks) as PortalBlockValue[];
  if ((reserved.has(before.slug) !== reserved.has(finalSlug)) || !validCore(finalSlug, finalBlocks)) { res.status(409).json({ error: "Core pages cannot change category and custom pages cannot contain system blocks" }); return; }
  if (parsed.data.slug && parsed.data.slug !== before.slug) {
    const [pathCollision] = await db.select({ id: donationActionsTable.id }).from(donationActionsTable).where(eq(donationActionsTable.slug, parsed.data.slug));
    if (pathCollision) { res.status(409).json({ error: "Slug collides with an existing route" }); return; }
  }
  const condition = and(eq(portalPagesTable.id, before.id), eq(portalPagesTable.version, parsed.data.expectedVersion));
  const [row] = await db.update(portalPagesTable).set({ ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}), ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}), ...(parsed.data.blocks !== undefined ? { draftBlocks: parsed.data.blocks } : {}), updatedBy: current.id, updatedAt: new Date(), version: before.version + 1 }).where(condition).returning();
  if (!row) { res.status(409).json({ error: "Version conflict", expectedVersion: parsed.data.expectedVersion, currentVersion: before.version }); return; }
  await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_page", entityId: row.id, action: "saved", metadata: { expectedVersion: parsed.data.expectedVersion } });
  res.json(pageResponse(row));
});
router.post("/admin/portal/pages/:id/publish", roles(...publishRoles), async (req, res): Promise<void> => {
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  const expectedVersion = Number(req.body?.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) { res.status(400).json({ error: "expectedVersion is required" }); return; }
  const [row] = await db.select().from(portalPagesTable).where(eq(portalPagesTable.id, String(req.params.id)));
  if (!row) { res.status(404).json({ error: "Page not found" }); return; }
  const blocks = portalBlocksSchema.safeParse(row.draftBlocks);
  if (!blocks.success || !validCore(row.slug, blocks.data)) { res.status(400).json({ error: "Published page has invalid blocks or required system block" }); return; }
  const mediaError = await validatePublish(row.draftBlocks); if (mediaError) { res.status(400).json({ error: mediaError }); return; }
  const [updated] = await db.update(portalPagesTable).set({ publishedBlocks: row.draftBlocks, status: "published", publishedAt: new Date(), updatedBy: current.id, updatedAt: new Date(), version: row.version + 1 }).where(and(eq(portalPagesTable.id, row.id), eq(portalPagesTable.version, expectedVersion))).returning();
  if (!updated) { res.status(409).json({ error: "Version conflict", currentVersion: row.version }); return; }
  await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_page", entityId: row.id, action: "published" });
  res.json(pageResponse(updated, false));
});
router.post("/admin/portal/pages/:id/unpublish", roles(...publishRoles), async (req, res): Promise<void> => {
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  const expectedVersion = Number(req.body?.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) { res.status(400).json({ error: "expectedVersion is required" }); return; }
  const [row] = await db.select().from(portalPagesTable).where(eq(portalPagesTable.id, String(req.params.id)));
  if (!row) { res.status(404).json({ error: "Page not found" }); return; }
  const [updated] = await db.update(portalPagesTable).set({ status: "draft", updatedBy: current.id, updatedAt: new Date(), version: row.version + 1 }).where(and(eq(portalPagesTable.id, row.id), eq(portalPagesTable.version, expectedVersion))).returning();
  if (!updated) { res.status(409).json({ error: "Version conflict", currentVersion: row.version }); return; }
  await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_page", entityId: row.id, action: "unpublished" });
  res.json(pageResponse(updated));
});

router.get("/admin/portal/media", roles(...readRoles), async (_req, res): Promise<void> => {
  const rows = await db.select().from(portalMediaTable).orderBy(desc(portalMediaTable.createdAt));
  res.json(rows.map(({ objectPath: _objectPath, ...row }) => row));
});
router.post("/admin/portal/media/upload-url", roles(...editRoles), async (req, res): Promise<void> => {
  const parsed = portalMediaUploadSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const target = await storage.getObjectEntityUploadTarget();
    const [media] = await db.insert(portalMediaTable).values({ objectPath: target.objectPath, contentType: parsed.data.contentType, size: parsed.data.size, uploadedBy: current.id }).returning();
    res.status(201).json({ id: media.id, uploadURL: target.uploadURL });
  } catch { res.status(500).json({ error: "Unable to generate upload URL" }); }
});
router.post("/admin/portal/media/:id/confirm", roles(...editRoles), async (req, res): Promise<void> => {
  const parsed = portalMediaConfirmSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  const [media] = await db.select().from(portalMediaTable).where(and(eq(portalMediaTable.id, String(req.params.id)), eq(portalMediaTable.uploadedBy, current.id)));
  if (!media) { res.status(404).json({ error: "Media upload not found" }); return; }
  if (media.status !== "pending") { res.status(409).json({ error: "Media is already confirmed and cannot be reconfirmed" }); return; }
  try {
    const actual = await storage.verifyUploadedMedia(media.objectPath);
    if (actual.contentType !== media.contentType || actual.size !== media.size) { res.status(400).json({ error: "Uploaded bytes do not match declared metadata" }); return; }
    const immutablePath = await storage.copyToImmutableObject(media.objectPath, actual.contentType);
    const [updated] = await db.update(portalMediaTable).set({ objectPath: immutablePath, altText: parsed.data.altText, status: "confirmed", confirmedAt: new Date() }).where(and(eq(portalMediaTable.id, media.id), eq(portalMediaTable.status, "pending"))).returning();
    if (!updated) { res.status(409).json({ error: "Media was already confirmed" }); return; }
    res.json({ id: updated.id, status: updated.status, altText: updated.altText, contentType: updated.contentType, size: updated.size });
  } catch { res.status(400).json({ error: "Media failed image type or size validation" }); }
});
router.get("/admin/portal/media/:id", roles(...readRoles), async (req, res): Promise<void> => {
  const [media] = await db.select().from(portalMediaTable).where(and(eq(portalMediaTable.id, String(req.params.id)), eq(portalMediaTable.status, "confirmed")));
  if (!media) { res.status(404).json({ error: "Media not found" }); return; }
  try { const response = await storage.downloadObject(await storage.getObjectEntityFile(media.objectPath), 0); response.headers.forEach((v, k) => res.setHeader(k, v)); res.setHeader("Content-Type", media.contentType); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); if (response.body) { const { Readable } = await import("node:stream"); Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else res.end(); } catch { res.status(404).json({ error: "Media not found" }); }
});

router.get("/admin/portal/settings", roles(...readRoles), async (_req, res): Promise<void> => { const [row] = await db.select().from(portalSettingsTable).where(eq(portalSettingsTable.id, 1)); res.json({ draft: row?.draft ?? {}, published: row?.published ?? null, version: row?.version ?? 1 }); });
router.patch("/admin/portal/settings", roles(...editRoles), async (req, res): Promise<void> => {
  const expectedVersion = Number(req.body?.expectedVersion);
  const parsed = portalSettingsSchema.safeParse(req.body?.draft); if (!parsed.success || !Number.isInteger(expectedVersion) || expectedVersion < 1) { res.status(400).json({ error: "draft and expectedVersion are required", details: parsed.success ? undefined : parsed.error.message }); return; }
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
  const [before] = await db.select().from(portalSettingsTable).where(eq(portalSettingsTable.id, 1));
  if (before && before.version !== expectedVersion) { res.status(409).json({ error: "Version conflict", currentVersion: before.version }); return; }
  if (!before && expectedVersion !== 1) { res.status(409).json({ error: "Initial settings version must be 1" }); return; }
  const [row] = before ? await db.update(portalSettingsTable).set({ draft: parsed.data, version: before.version + 1, updatedBy: current.id, updatedAt: new Date() }).where(and(eq(portalSettingsTable.id, 1), eq(portalSettingsTable.version, expectedVersion))).returning() : await db.insert(portalSettingsTable).values({ draft: parsed.data, updatedBy: current.id }).returning();
  if (!row) { res.status(409).json({ error: "Version conflict", currentVersion: before?.version }); return; }
  await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_settings", entityId: "1", action: "saved" }); res.json({ draft: row.draft, published: row.published, version: row.version });
});
router.post("/admin/portal/settings/publish", roles(...publishRoles), async (req, res): Promise<void> => {
  const current = await user(req); if (!current) { res.status(401).json({ error: "Authentication required" }); return; } const expectedVersion = Number(req.body?.expectedVersion); if (!Number.isInteger(expectedVersion) || expectedVersion < 1) { res.status(400).json({ error: "expectedVersion is required" }); return; } const [row] = await db.select().from(portalSettingsTable).where(eq(portalSettingsTable.id, 1)); if (!row) { res.status(404).json({ error: "Settings not found" }); return; }
  const [updated] = await db.update(portalSettingsTable).set({ published: row.draft, version: row.version + 1, updatedBy: current.id, updatedAt: new Date() }).where(and(eq(portalSettingsTable.id, 1), eq(portalSettingsTable.version, expectedVersion))).returning(); if (!updated) { res.status(409).json({ error: "Version conflict", currentVersion: row.version }); return; } await db.insert(auditLogsTable).values({ userId: current.id, entityType: "portal_settings", entityId: "1", action: "published" }); res.json({ draft: updated.draft, published: updated.published, version: updated.version });
});
export default router;