// The X-ray tour: every windowed screen, in sidebar order. Labels and hrefs come from the nav, never copied.
import { APP_NAV } from '@/components/shell/sidebar/navItems';
import type { Callout, TourStop } from '../model/types';
import { NEEDS_YOU } from './screens/decide/needs-you';
import { CYCLES } from './screens/decide/cycles';
import { TASK } from './screens/decide/task';
import { FLEET } from './screens/watch/fleet';
import { MONITOR } from './screens/watch/monitor';
import { ONBOARD } from './screens/watch/onboard';
import { RUNS } from './screens/watch/runs';
import { LADDER } from './screens/trust/ladder';
import { MATURITY } from './screens/trust/maturity';
import { SETUP } from './screens/trust/setup';
import { THEATER } from './screens/trust/theater';
import { TRACE } from './screens/trust/trace';

/** Keyed by APP_NAV key. A nav entry with no callouts here is simply not on the tour. */
export const CALLOUTS: Record<string, readonly Callout[]> = {
  fleet: FLEET,
  monitor: MONITOR,
  'needs-you': NEEDS_YOU,
  ladder: LADDER,
  maturity: MATURITY,
  cycles: CYCLES,
  task: TASK,
  onboard: ONBOARD,
  setup: SETUP,
  trace: TRACE,
  theater: THEATER,
  runs: RUNS,
};

export const TOUR: readonly TourStop[] = APP_NAV.filter((e) => CALLOUTS[e.key]).map((e) => ({
  key: e.key,
  href: e.href,
  label: e.label,
  callouts: CALLOUTS[e.key]!,
}));

/** The tour stop a nav key is, or null for a screen the X-ray does not label. */
export const stopOf = (key: string | null): TourStop | null => TOUR.find((s) => s.key === key) ?? null;

/** The stop after this one, or null at the end. */
export const nextStop = (key: string | null): TourStop | null => {
  const i = TOUR.findIndex((s) => s.key === key);
  return i >= 0 ? (TOUR[i + 1] ?? null) : (TOUR[0] ?? null);
};
