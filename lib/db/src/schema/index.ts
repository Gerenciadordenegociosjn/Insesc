import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id; never provisioned from an arbitrary public request
  email: text("email"),
  name: text("name"),
  role: text("role").notNull().default("unassigned"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const donationActionsTable = pgTable("donation_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  publicDescription: text("public_description").notNull(),
  internalDescription: text("internal_description"),
  goalCents: integer("goal_cents"),
  suggestedAmounts: jsonb("suggested_amounts").$type<number[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: text("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const donationsTable = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionId: uuid("action_id").notNull().references(() => donationActionsTable.id),
  donorUserId: text("donor_user_id").references(() => usersTable.id),
  amountCents: integer("amount_cents").notNull(),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  gatewayTransactionId: text("gateway_transaction_id"),
  anonymous: boolean("anonymous").notNull().default(true),
  communicationConsent: boolean("communication_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const expensesTable = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionId: uuid("action_id").notNull().references(() => donationActionsTable.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  beneficiaryName: text("beneficiary_name"),
  beneficiaryDocumentEncrypted: text("beneficiary_document_encrypted"),
  originalReceiptPath: text("original_receipt_path"),
  reviewedReceiptPath: text("reviewed_receipt_path"),
  publicDescription: text("public_description"),
  status: text("status").notNull().default("pending_review"),
  createdBy: text("created_by").notNull().references(() => usersTable.id),
  reviewedBy: text("reviewed_by").references(() => usersTable.id),
  publishedBy: text("published_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const objectUploadIntentsTable = pgTable("object_upload_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull().references(() => usersTable.id),
  expenseId: uuid("expense_id").references(() => expensesTable.id),
  purpose: text("purpose").notNull(), // original | reviewed
  declaredContentType: text("declared_content_type").notNull(),
  declaredSize: integer("declared_size").notNull(),
  status: text("status").notNull().default("issued"), // issued | consumed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const insertDonationActionSchema = createInsertSchema(donationActionsTable);
export const insertDonationSchema = createInsertSchema(donationsTable);
export const insertExpenseSchema = createInsertSchema(expensesTable);
export const insertAuditLogSchema = createInsertSchema(auditLogsTable);
export type User = typeof usersTable.$inferSelect;
export type DonationAction = typeof donationActionsTable.$inferSelect;
export type Donation = typeof donationsTable.$inferSelect;
export type Expense = typeof expensesTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertDonationAction = z.infer<typeof insertDonationActionSchema>;