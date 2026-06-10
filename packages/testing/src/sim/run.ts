/**
 * Dispatch simulation runner — placeholder.
 *
 * Spins up N virtual drivers and M virtual riders requesting trips on a
 * Poisson process, runs the real dispatch engine against a clean DB, and
 * asserts ETA/coverage metrics. Wired up in Phase 4 of the plan.
 */

async function main(): Promise<void> {
  console.warn('[sim] dispatch simulation not yet implemented. See plan §14.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
