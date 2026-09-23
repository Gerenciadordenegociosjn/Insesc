import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyStripeDonation } from "./stripeClassification.ts";

const donation = { id: "d1", actionId: "a1", amountCents: 1000 };
const session = { payment_status: "paid", currency: "brl", amount_total: 1000, metadata: { donationId: "d1", actionId: "a1", amountCents: "1000", currency: "brl" } };
const intent = { status: "succeeded", amount_received: 1000, currency: "brl" };

describe("Stripe donation classification", () => {
  it("accepts a verified success", () => assert.deepEqual(classifyStripeDonation(session, intent, { amount_refunded: 0 }, donation), { status: "paid", refundedCents: 0 }));
  it("rejects mismatched currency or amount", () => {
    assert.equal(classifyStripeDonation({ ...session, currency: "usd" }, intent, null, donation), null);
    assert.equal(classifyStripeDonation({ ...session, amount_total: 999 }, intent, null, donation), null);
  });
  it("keeps partial refunds paid with net amount", () => assert.deepEqual(classifyStripeDonation(session, intent, { amount_refunded: 250 }, donation), { status: "paid", refundedCents: 250 }));
  it("excludes a full refund", () => assert.deepEqual(classifyStripeDonation(session, intent, { amount_refunded: 1000 }, donation), { status: "refunded", refundedCents: 1000 }));
  it("rejects no payment intent and metadata mismatch", () => {
    assert.equal(classifyStripeDonation(session, null, null, donation), null);
    assert.equal(classifyStripeDonation({ ...session, metadata: { ...session.metadata, donationId: "other" } }, intent, null, donation), null);
  });
});