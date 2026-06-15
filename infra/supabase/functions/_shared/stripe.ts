// deno-lint-ignore-file no-explicit-any
import Stripe from 'npm:stripe@17.4.0';

export function stripeConfigured(): boolean {
  return Boolean(Deno.env.get('STRIPE_SECRET_KEY'));
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!client) {
    client = new Stripe(key, {
      // Use the account's default API version; Fetch/SubtleCrypto for Deno.
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return client;
}

// Web Crypto-based signature verifier (Deno has no Node crypto).
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
