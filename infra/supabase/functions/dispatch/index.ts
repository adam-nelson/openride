// Dispatch engine — Sprint 4 deliverable. Sketched here so the directory and
// invocation path exist; the loop, candidate query, and offer publishing are
// implemented in Phase 4 of the plan.

import { handleCors, error, json } from '../_shared/cors.ts';

Deno.serve((req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;
  return error('Dispatch engine not yet implemented. See plan §7.', 501, 'not_implemented');
});
