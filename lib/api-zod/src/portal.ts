import { z } from "zod";

const href = z.string().max(500).refine((v) => {
  if (/[<>"'`\\]/.test(v)) return false;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  return /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?(?:\?[^\s]*)?(?:#[^\s]*)?$/i.test(v);
}, "O link deve ser um caminho interno ou uma URL HTTPS");
const base = z.object({ id: z.string().min(1), background: z.string().max(100).optional(), alignment: z.enum(["left", "center", "right"]).optional(), width: z.enum(["narrow", "medium", "wide", "full"]).optional() }).strict();
export const portalBlockSchema = z.discriminatedUnion("type", [
  base.extend({ type: z.literal("hero"), heading: z.string().max(300), body: z.string().max(5000).optional(), imageId: z.string().uuid().optional(), cta: z.object({ label: z.string().min(1).max(80), href }).optional() }),
  base.extend({ type: z.literal("banner"), text: z.string().max(500), imageId: z.string().uuid().optional(), cta: z.object({ label: z.string().min(1).max(80), href }).optional() }),
  base.extend({ type: z.literal("text"), heading: z.string().max(300).optional(), body: z.string().max(10000) }),
  base.extend({ type: z.literal("image"), mediaId: z.string().uuid(), caption: z.string().max(500).optional() }),
  base.extend({ type: z.literal("split"), heading: z.string().max(300).optional(), body: z.string().max(6000), mediaId: z.string().uuid(), reverse: z.boolean().optional() }),
  base.extend({ type: z.literal("cards"), heading: z.string().max(300).optional(), cards: z.array(z.object({ title: z.string().max(160), body: z.string().max(1000), href: href.optional() }).strict()).max(24) }),
  base.extend({ type: z.literal("gallery"), heading: z.string().max(300).optional(), mediaIds: z.array(z.string().uuid()).max(40) }),
  base.extend({ type: z.literal("system"), system: z.enum(["actions", "transparency", "journey"]) }),
]);
export const portalBlocksSchema = z.array(portalBlockSchema).max(100);
export const portalPageInputSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), title: z.string().min(1).max(200), blocks: portalBlocksSchema, expectedVersion: z.number().int().positive().optional() }).strict();
export const portalSettingsSchema = z.object({ footerInstitutional: z.string().max(5000), officialLinks: z.array(z.object({ label: z.string().min(1).max(120), href }).strict()).max(30), contact: z.object({ email: z.string().email().max(200).optional(), phone: z.string().max(60).optional(), address: z.string().max(300).optional() }).strict() }).strict();
export const portalMediaUploadSchema = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive().max(8 * 1024 * 1024), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]) }).strict();
export const portalMediaConfirmSchema = z.object({ altText: z.string().min(1).max(300) }).strict();
export type PortalBlockValue = z.infer<typeof portalBlockSchema>;