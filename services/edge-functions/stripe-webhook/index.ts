// Stripe webhook receiver — Sprint 6 deliverable. Sketched here so the route
// exists; signature verification + PaymentIntent handling implemented in Phase 6.

import { handleCors, error, json } from '../_shared/cors.ts';

Deno.serve((req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  return error('Stripe webhook not yet implemented. See plan §6.', 501, 'not_implemented');
});
