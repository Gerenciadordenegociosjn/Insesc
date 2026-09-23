import { ReplitConnectors } from "@replit/connectors-sdk";

/** Stripe is accessed through Replit's connector proxy; no secret is read here. */
export const stripeProxy = new ReplitConnectors().createProxyFetch("stripe");