export interface FatigueWindow {
  /** Rolling-window length in seconds. Default 24h. */
  windowS?: number;
  /** Hard cap on cumulative drive time in the window. Default 12h. */
  capS?: number;
  /** Required rest after a lockout. Default 10h. */
  lockoutRestS?: number;
}

export interface DriveSegment {
  startedAt: Date;
  endedAt: Date;
}

export interface FatigueStatus {
  driveTimeS: number;
  remainingS: number;
  isOverCap: boolean;
}

const ONE_HOUR_S = 3600;
const DEFAULTS: Required<FatigueWindow> = {
  windowS: 24 * ONE_HOUR_S,
  capS: 12 * ONE_HOUR_S,
  lockoutRestS: 10 * ONE_HOUR_S,
};

/**
 * Sum drive time within the trailing window ending at `now`, and report whether
 * the driver has hit the cap. Pure function — no IO, no clock — so it's easy
 * to test with a frozen `now`.
 */
export function fatigueStatus(
  segments: DriveSegment[],
  now: Date,
  opts: FatigueWindow = {},
): FatigueStatus {
  const { windowS, capS } = { ...DEFAULTS, ...opts };
  const windowStartMs = now.getTime() - windowS * 1000;

  let driveTimeMs = 0;
  for (const seg of segments) {
    const segStart = Math.max(seg.startedAt.getTime(), windowStartMs);
    const segEnd = Math.min(seg.endedAt.getTime(), now.getTime());
    if (segEnd > segStart) driveTimeMs += segEnd - segStart;
  }

  const driveTimeS = Math.floor(driveTimeMs / 1000);
  return {
    driveTimeS,
    remainingS: Math.max(0, capS - driveTimeS),
    isOverCap: driveTimeS >= capS,
  };
}
