import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db, donationsTable } from "@workspace/db";
import { getUncachableStripeClient } from "./stripeClient";
import { classifyStripeDonation } from "./stripeClassification";

let running = false;
let sessionCursor: string | undefined;
export async function reconcileStripeDonations(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const stripe = await getUncachableStripeClient();
    const now = new Date();
    const pendingRows = await db.select().from(donationsTable)
      .where(and(eq(donationsTable.paymentStatus, "pending"), lte(donationsTable.nextReconcileAt, now)))
      .orderBy(asc(donationsTable.nextReconcileAt)).limit(40);
    const paidRows = await db.select().from(donationsTable)
      .where(and(eq(donationsTable.paymentStatus, "paid"), lte(donationsTable.nextReconcileAt, now)))
      .orderBy(asc(donationsTable.nextReconcileAt)).limit(10);
    const rows = [...pendingRows, ...paidRows];
    if (!rows.length) return;
    const sessionsByDonation = new Map<string, any>();
    if (rows.some((row) => !row.stripeCheckoutSessionId)) {
      try {
        let startingAfter: string | undefined;
        for (let page = 0; page < 10; page++) {
          const response = await stripe.sessions.list(sessionCursor ?? startingAfter);
          for (const session of response.data ?? []) if (session.metadata?.donationId) sessionsByDonation.set(session.metadata.donationId, session);
          if (!response.has_more || !response.data?.length) {
            sessionCursor = undefined;
            break;
          }
          startingAfter = response.data[response.data.length - 1].id;
          sessionCursor = startingAfter;
        }
      } catch { /* row-level backoff below preserves fairness during outages */ }
    }
    for (const donation of rows) {
      let rescheduled = false;
      try {
        const recovered = donation.stripeCheckoutSessionId ? undefined : sessionsByDonation.get(donation.id);
        const sessionId = donation.stripeCheckoutSessionId ?? recovered?.id;
        if (!sessionId) continue;
        const session = await stripe.sessions.retrieve(sessionId);
        const metadata = session.metadata ?? {};
        if (metadata.donationId !== donation.id || metadata.actionId !== donation.actionId ||
          metadata.amountCents !== String(donation.amountCents) || metadata.currency !== "brl") continue;
        if (!donation.stripeCheckoutSessionId) {
          await db.update(donationsTable).set({ stripeCheckoutSessionId: session.id, gatewayTransactionId: session.id })
            .where(and(eq(donationsTable.id, donation.id), eq(donationsTable.paymentStatus, donation.paymentStatus)));
        }
        if (typeof session.payment_intent !== "string") continue;
        const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
        const charge = typeof intent.latest_charge === "string" ? await stripe.charges.retrieve(intent.latest_charge) : null;
        const classification = classifyStripeDonation(session, intent, charge, donation);
        const status = classification?.status ?? (session.status === "expired" ? "failed" : null);
        if (!status) continue;
        await db.update(donationsTable).set({
          paymentStatus: status, refundedCents: classification?.refundedCents ?? 0, stripePaymentIntentId: intent.id,
          ...(status === "paid" ? { paidAt: new Date() } : {}),
          ...(status === "refunded" ? { refundedAt: new Date() } : {}),
          nextReconcileAt: new Date(Date.now() + (status === "paid" ? 15 * 60_000 : 60_000)),
        }).where(and(eq(donationsTable.id, donation.id), eq(donationsTable.paymentStatus, donation.paymentStatus)));
        rescheduled = true;
      } catch {
        // One unavailable/invalid Stripe object must not stop the bounded batch.
      } finally {
        if (!rescheduled) {
          await db.update(donationsTable).set({
            nextReconcileAt: new Date(Date.now() + (donation.paymentStatus === "pending" ? 60_000 : 15 * 60_000)),
          }).where(and(eq(donationsTable.id, donation.id), eq(donationsTable.paymentStatus, donation.paymentStatus)));
        }
      }
    }
  } finally {
    running = false;
  }
}