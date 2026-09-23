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
import { getUncachableStripeClient, setStripeReady } from "../stripeClient";
import { classifyStripeDonation } from "../stripeClassification";

const router: IRouter = Router();
const staffRoles = new Set(["administrator", "financial", "content", "transparency", "auditor", "support"]);
const objectStorage = new ObjectStorageService();
const checkoutAttempts = new Map<string, { count: number; resetAt: number }>();
function allowCheckout(req: Request): boolean {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = checkoutAttempts.get(key);
  if (!current || current.resetAt <= now) {
    checkoutAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}
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
    total: sql<number>`coalesce(sum(${donationsTable.amountCents} - ${donationsTable.refundedCents}), 0)`,
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

router.get("/public/checkout-status", async (_req, res): Promise<void> => {
  try {
    await getUncachableStripeClient();
    setStripeReady(true);
    res.json(GetCheckoutStatusResponse.parse({ available: true, reason: "Stripe Checkout" }));
  } catch {
    res.json(GetCheckoutStatusResponse.parse({ available: false, reason: "Stripe não está configurado ou está temporariamente indisponível." }));
  }
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

router.post("/public/donations/create-checkout", async (req, res): Promise<void> => {
  if (!allowCheckout(req)) { res.status(429).json({ error: "Too many checkout attempts. Try again shortly." }); return; }
  const parsed = CreateDonationCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid checkout request" }); return; }
  const { actionId, amountCents, anonymous = true, communicationConsent = false } = parsed.data;
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 10_000_000) {
    res.status(400).json({ error: "Donation must be between R$ 1.00 and R$ 100,000.00." }); return;
  }
  const [action] = await db.select().from(donationActionsTable)
    .where(and(eq(donationActionsTable.id, actionId), eq(donationActionsTable.status, "published")));
  if (!action) { res.status(404).json({ error: "Published action not found." }); return; }
  const domain = process.env.PUBLIC_APP_URL ?? process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) { res.status(503).json({ error: "Checkout is not configured." }); return; }
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  let createdDonationId: string | undefined;
  let sessionCreateStarted = false;
  try {
    const stripe = await getUncachableStripeClient();
    setStripeReady(true);
    const products = await stripe.products.search();
    const product = products.find((item: any) => item.metadata?.incesc_donation === "true") ??
      await stripe.products.create("Doação INCESC", "Doação para uma ação publicada do INCESC", "incesc-donation-product-v1");
    // Prices are created server-side and referenced by ID; price_data is never accepted from clients.
    const userId = clerkUserId(req);
    if (!anonymous && !userId) { res.status(401).json({ error: "Login is required for a non-anonymous donation." }); return; }
    const [donation] = await db.insert(donationsTable).values({
      actionId, donorUserId: anonymous ? null : userId, amountCents,
      paymentMethod: "stripe", paymentStatus: "pending", anonymous, communicationConsent,
    }).returning();
    createdDonationId = donation.id;
    const prices = await stripe.prices.list(product.id);
    const price = prices.find((candidate: any) => candidate.unit_amount === amountCents &&
      candidate.currency === "brl" && candidate.active === true && !candidate.recurring) ??
      await stripe.prices.create(product.id, amountCents, actionId, `incesc-donation-price-${amountCents}`);
    const metadata = { donationId: donation.id, actionId, amountCents: String(amountCents), currency: "brl" };
    sessionCreateStarted = true;
    const session = await stripe.sessions.create({
      mode: "payment", "line_items[0][price]": price.id, "line_items[0][quantity]": "1",
      success_url: `${baseUrl}/doacoes/confirmacao?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      "metadata[donationId]": metadata.donationId, "metadata[actionId]": actionId,
      "metadata[amountCents]": metadata.amountCents, "metadata[currency]": "brl",
      "payment_intent_data[metadata][donationId]": donation.id,
      "payment_intent_data[metadata][actionId]": actionId,
      "payment_intent_data[metadata][amountCents]": metadata.amountCents,
      "payment_intent_data[metadata][currency]": "brl",
      customer_email: anonymous ? undefined : (await currentUser(req))?.email ?? undefined,
    }, `incesc-donation-session-${donation.id}`);
    if (!session.url) {
      await db.update(donationsTable).set({ paymentStatus: "failed" }).where(eq(donationsTable.id, donation.id));
      res.status(503).json({ error: "Stripe did not return a Checkout URL." }); return;
    }
    await db.update(donationsTable).set({ stripeCheckoutSessionId: session.id, gatewayTransactionId: session.id })
      .where(eq(donationsTable.id, donation.id));
    res.status(201).json({ checkoutUrl: session.url, donationId: donation.id });
  } catch (error) {
    if (createdDonationId && !sessionCreateStarted) await db.update(donationsTable).set({ paymentStatus: "failed" }).where(and(eq(donationsTable.id, createdDonationId), eq(donationsTable.paymentStatus, "pending")));
    req.log.error({ err: error }, "Stripe checkout creation failed");
    res.status(503).json({ error: "Checkout indisponível: Stripe não está configurado ou está temporariamente indisponível." });
  }
});

router.get("/public/donations/checkout-status/:sessionId", async (req, res): Promise<void> => {
  const sessionId = req.params.sessionId as string;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) { res.status(400).json({ error: "Invalid Checkout session." }); return; }
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.sessions.retrieve(sessionId);
    const metadata = session.metadata ?? {};
    if (!metadata.donationId || !metadata.actionId || metadata.currency !== "brl") {
      res.status(400).json({ error: "Checkout metadata is invalid." }); return;
    }
    const [donation] = await db.select().from(donationsTable).where(eq(donationsTable.id, metadata.donationId));
    if (!donation) { res.status(404).json({ error: "Donation not found." }); return; }
    if (metadata.actionId !== donation.actionId || metadata.amountCents !== String(donation.amountCents) ||
      session.id !== donation.stripeCheckoutSessionId && donation.stripeCheckoutSessionId !== null) {
      res.status(400).json({ error: "Checkout does not match donation." }); return;
    }
    let classification: ReturnType<typeof classifyStripeDonation> = null;
    if (session.payment_status === "paid" && session.currency === "brl" && session.amount_total === donation.amountCents && typeof session.payment_intent === "string") {
      const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
      const charge = typeof intent.latest_charge === "string" ? await stripe.charges.retrieve(intent.latest_charge) : null;
      classification = classifyStripeDonation(session, intent, charge, donation);
    }
    if (classification && (donation.paymentStatus === "pending" || donation.paymentStatus === "paid")) {
      await db.update(donationsTable).set({
        paymentStatus: classification.status, refundedCents: classification.refundedCents,
        paidAt: donation.paidAt ?? new Date(), stripePaymentIntentId: session.payment_intent as string,
        ...(classification.status === "refunded" ? { refundedAt: new Date() } : {}),
        nextReconcileAt: new Date(Date.now() + 900_000),
      }).where(and(eq(donationsTable.id, donation.id), inArray(donationsTable.paymentStatus, ["pending", "paid"])));
    }
    const [updated] = await db.select().from(donationsTable).where(eq(donationsTable.id, donation.id));
    const current = updated ?? donation;
    res.json({ donationId: donation.id, paymentStatus: current.paymentStatus, refundedCents: current.refundedCents, netAmountCents: current.amountCents - current.refundedCents });
  } catch (error) {
    req.log.error({ err: error }, "Stripe checkout status retrieval failed");
    res.status(503).json({ error: "Unable to verify payment with Stripe." });
  }
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  res.json(GetMeResponse.parse({ userId: user.id, role: user.active ? user.role : "unassigned" }));
});

router.get("/me/donations", requireAuth, async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user || !user.active) { res.status(403).json({ error: "Account inactive" }); return; }
  const rows = await db.select().from(donationsTable).where(and(eq(donationsTable.donorUserId, user.id), inArray(donationsTable.paymentStatus, ["paid", "refunded"]))).orderBy(desc(donationsTable.createdAt));
  res.json(ListMyDonationsResponse.parse(rows.map((d) => ({ id: d.id, actionId: d.actionId, amountCents: d.amountCents, refundedCents: d.refundedCents, netAmountCents: d.amountCents - d.refundedCents, paymentStatus: d.paymentStatus, createdAt: d.createdAt, paidAt: d.paidAt }))));
});

router.post("/admin/storage/uploads/request-url", requireRoles("administrator", "financial", "transparency"), async (req, res): Promise<void> => {
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
  if (owner.role === "transparency" && purpose !== "reviewed") {
    res.status(403).json({ error: "Transparency reviewers may only upload reviewed receipts" }); return;
  }
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
  const [raised] = await db.select({ total: sql<number>`coalesce(sum(${donationsTable.amountCents} - ${donationsTable.refundedCents}), 0)` }).from(donationsTable).where(inArray(donationsTable.paymentStatus, ["paid", "refunded"]));
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
router.get("/admin/action-options", requireRoles("administrator", "financial", "transparency", "auditor", "content"), async (_req, res): Promise<void> => {
  const rows = await db.select({ id: donationActionsTable.id, title: donationActionsTable.title })
    .from(donationActionsTable).where(inArray(donationActionsTable.status, ["published", "funded", "executing", "completed", "draft"])).orderBy(donationActionsTable.title);
  res.json(rows);
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
  await db.insert(auditLogsTable).values({ userId: user.id, entityType: "donation_action", entityId: id, action: parsed.data.status !== undefined && parsed.data.status !== before.status ? "state_transition_approved" : "updated", metadata: { changedFields: Object.keys(parsed.data), previousStatus: before.status, nextStatus: row.status } });
  const totals = await actionTotals([row.id]);
  res.json({ ...row, raisedCents: totals.get(row.id)!.raised });
});

router.get("/admin/donations", requireRoles("administrator", "financial", "auditor"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(donationsTable).orderBy(desc(donationsTable.createdAt));
  res.json(ListAdminDonationsResponse.parse(rows.map((d) => ({ ...d, netAmountCents: d.amountCents - d.refundedCents }))));
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
  res.json(ListAdminAuditLogsResponse.parse(rows.map((row) => ({
    ...row,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : null,
  }))));
});

export default router;