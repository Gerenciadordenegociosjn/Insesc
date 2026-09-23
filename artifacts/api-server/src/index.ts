import app from "./app";
import { logger } from "./lib/logger";
import { getUncachableStripeClient, setStripeReady } from "./stripeClient";
import { reconcileStripeDonations } from "./webhookHandlers";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe(): Promise<void> {
  await getUncachableStripeClient();
  setStripeReady(true);
}

try {
  await initStripe();
} catch (error) {
  // Keep public/read-only API available; checkout-status and checkout routes
  // surface the provider outage explicitly until the connection is restored.
  logger.error({ err: error }, "Stripe initialization failed");
  setStripeReady(false);
}
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
setInterval(() => {
  void reconcileStripeDonations().catch((error) => logger.warn({ err: error }, "Stripe reconciliation deferred"));
}, 60_000).unref();
