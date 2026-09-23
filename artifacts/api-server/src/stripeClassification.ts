export type DonationForClassification = {
  id: string;
  actionId: string;
  amountCents: number;
};

export function classifyStripeDonation(
  session: any,
  intent: any | null,
  charge: any | null,
  donation: DonationForClassification,
): { status: "paid" | "refunded"; refundedCents: number } | null {
  const metadata = session?.metadata ?? {};
  if (metadata.donationId !== donation.id || metadata.actionId !== donation.actionId ||
    metadata.amountCents !== String(donation.amountCents) || metadata.currency !== "brl") return null;
  if (session?.payment_status !== "paid" || session.currency !== "brl" ||
    session.amount_total !== donation.amountCents || !intent ||
    intent.status !== "succeeded" || intent.amount_received !== donation.amountCents ||
    intent.currency !== "brl") return null;
  let refundedCents = Number(charge?.amount_refunded ?? 0);
  if (charge?.refunded && refundedCents < donation.amountCents) refundedCents = donation.amountCents;
  return { status: refundedCents >= donation.amountCents ? "refunded" : "paid", refundedCents };
}