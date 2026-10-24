// The X-ray tour: five screens, in the order a new user meets them. Labels and hrefs come from the nav, never copied.
import { ALL_NAV } from '@/components/shell/sidebar/navItems';
import type { Callout, TourStop } from '../model/types';
import { MONITOR, NEEDS_YOU } from './desk';
import { FLEET } from './fleet';
import { LADDER, SETUP } from './trust';

const CALLOUTS: Record<string, readonly Callout[]> = {
  fleet: FLEET,
  'needs-you': NEEDS_YOU,
  monitor: MONITOR,
  ladder: LADDER,
  setup: SETUP,
};

export const TOUR: readonly TourStop[] = ['fleet', 'needs-you', 'monitor', 'ladder', 'setup'].map((key) => {
  const e = ALL_NAV.find((n) => n.key === key);
  return { key, href: e?.href ?? `/${key}`, label: e?.label ?? key, callouts: CALLOUTS[key] ?? [] };
});

/** The tour stop a nav key is, or null for a screen the X-ray does not label. */
export const stopOf = (key: string | null): TourStop | null => TOUR.find((s) => s.key === key) ?? null;

/** The stop after this one, or null at the end. */
export const nextStop = (key: string | null): TourStop | null => {
  const i = TOUR.findIndex((s) => s.key === key);
  return i >= 0 ? (TOUR[i + 1] ?? null) : (TOUR[0] ?? null);
};
