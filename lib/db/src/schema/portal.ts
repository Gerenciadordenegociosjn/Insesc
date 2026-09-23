import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./index";

export const portalPagesTable = pgTable("portal_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  draftBlocks: jsonb("draft_blocks").notNull().default([]),
  publishedBlocks: jsonb("published_blocks"),
  status: text("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: text("created_by").notNull().references(() => usersTable.id),
  updatedBy: text("updated_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("portal_pages_status_idx").on(table.status)]);

export const portalMediaTable = pgTable("portal_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  altText: text("alt_text"),
  status: text("status").notNull().default("pending"),
  uploadedBy: text("uploaded_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
}, (table) => [index("portal_media_status_idx").on(table.status)]);

export const portalSettingsTable = pgTable("portal_settings", {
  id: integer("id").primaryKey().default(1),
  draft: jsonb("draft").notNull().default({}),
  published: jsonb("published"),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by").notNull().references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PortalPage = typeof portalPagesTable.$inferSelect;
export type PortalMedia = typeof portalMediaTable.$inferSelect;
export type PortalSettings = typeof portalSettingsTable.$inferSelect;