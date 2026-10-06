// Two clocks: when a poll happens, and the instant the screens read the index at (feed ages and countdowns are measured
// against it). Live against a real group they are both "now".
import { SEED_NOW } from '@/server/index/seed/parse';

export interface Clock {
  poll(): Date;
  read(): Date;
}

export const systemClock: Clock = { poll: () => new Date(), read: () => new Date() };

/**
 * The fake group's replay clock. The demo's numbers are a frozen moment (14:22, feed 12 s old, countdowns "19 h 12 m"),
 * so the fake group is polled at 14:21:48 and read at 14:22:00, always. The screens then show what the demo shows, and
 * what they show is plainly a replay, not today.
 */
export const replayClock: Clock = {
  poll: () => new Date(SEED_NOW.getTime() - 12_000),
  read: () => SEED_NOW,
};
