import { describe, expect, it } from 'vitest';

import { fatigueStatus } from './fatigue';

const HOUR = 3600 * 1000;

describe('fatigueStatus', () => {
  it('reports zero drive time for no segments', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    const status = fatigueStatus([], now);
    expect(status.driveTimeS).toBe(0);
    expect(status.isOverCap).toBe(false);
  });

  it('sums segments inside the trailing 24h window', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    const segments = [
      { startedAt: new Date(now.getTime() - 4 * HOUR), endedAt: new Date(now.getTime() - 3 * HOUR) },
      { startedAt: new Date(now.getTime() - 2 * HOUR), endedAt: new Date(now.getTime() - 1 * HOUR) },
    ];
    const status = fatigueStatus(segments, now);
    expect(status.driveTimeS).toBe(2 * 3600);
    expect(status.isOverCap).toBe(false);
  });

  it('clips segments straddling the window boundary', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    const segments = [
      { startedAt: new Date(now.getTime() - 30 * HOUR), endedAt: new Date(now.getTime() - 22 * HOUR) },
    ];
    const status = fatigueStatus(segments, now);
    expect(status.driveTimeS).toBe(2 * 3600);
  });

  it('flags lockout at the 12h cap', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    const segments = [
      { startedAt: new Date(now.getTime() - 12 * HOUR), endedAt: now },
    ];
    const status = fatigueStatus(segments, now);
    expect(status.driveTimeS).toBe(12 * 3600);
    expect(status.isOverCap).toBe(true);
    expect(status.remainingS).toBe(0);
  });
});
