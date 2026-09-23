---
name: Stripe connector payment confirmation
description: Why this project verifies donations through a Stripe proxy rather than a webhook-secret integration
---

The connected Stripe integration is proxy-only; do not assume its connection settings expose a Stripe secret key or webhook signing secret. Keep the donation ledger derived from Stripe state verified on the server, with ongoing reconciliation for payment changes and refunds. Never count a Checkout redirect as payment confirmation. Treat partial refunds as a reduction of the paid amount, not as a fully refunded donation, and preserve a scheduled route for checking new payments and older refunds.

**Why:** The standard secret-key/webhook setup could not initialize with this connection even though its authenticated Stripe API proxy was healthy. A webhook-dependent checkout would either stay disabled or accept money without durable confirmation. Treating any refund as full distorted the financial totals; scanning all payment history in order delayed new confirmations as history grew.

**How to apply:** When changing donation checkout, recovery, or totals, use the authenticated connector path and preserve fail-closed verification, net refund accounting, and scheduled reconciliation with a path for recovering ambiguous Checkout creation. If the integration later gains signed webhooks, verify the new capability before replacing reconciliation.