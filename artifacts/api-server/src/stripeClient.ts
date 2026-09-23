import { ReplitConnectors, type ProxyOptions } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
export let stripeReady = false;
export function setStripeReady(value: boolean): void { stripeReady = value; }

async function request(path: string, init?: ProxyOptions): Promise<any> {
  const response = await connectors.proxy("stripe", `/v1/${path}`, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`Stripe proxy request failed (${response.status})`);
  return text ? JSON.parse(text) : {};
}
function form(values: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
  return params;
}
export const stripeProxy = {
  account: () => request("account"),
  products: {
    search: async () => (await request("products?active=true&limit=100")).data,
    create: async (name: string, description: string, key: string) => request("products", { method: "POST", headers: { "Idempotency-Key": key }, body: form({ name, description, "metadata[incesc_donation]": "true" }) }),
  },
  prices: {
    list: async (product: string) => (await request(`prices?product=${encodeURIComponent(product)}&active=true&limit=100`)).data,
    create: async (product: string, amount: number, actionId: string, key: string) => request("prices", { method: "POST", headers: { "Idempotency-Key": key }, body: form({ product, currency: "brl", unit_amount: amount, "metadata[actionId]": actionId }) }),
  },
  sessions: {
    create: async (values: Record<string, string | undefined>, key: string) => request("checkout/sessions", { method: "POST", headers: { "Idempotency-Key": key }, body: form(values) }),
    list: async (startingAfter?: string) => request(`checkout/sessions?limit=100${startingAfter ? `&starting_after=${encodeURIComponent(startingAfter)}` : ""}`),
    retrieve: async (id: string) => request(`checkout/sessions/${encodeURIComponent(id)}`),
  },
  paymentIntents: {
    retrieve: async (id: string) => request(`payment_intents/${encodeURIComponent(id)}`),
  },
  charges: {
    retrieve: async (id: string) => request(`charges/${encodeURIComponent(id)}`),
  },
};
export async function getUncachableStripeClient(): Promise<typeof stripeProxy> {
  await stripeProxy.account();
  return stripeProxy;
}
export async function getStripeSync(): Promise<never> {
  throw new Error("Stripe webhook sync is unavailable with the proxy-only connector.");
}