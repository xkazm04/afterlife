// The host's screens: every module's own screen/host.tsx, merged. This file only imports them; a module converts its
// screens (and sets ready) in its own file, never here. A key no module defines, or one defined with ready false, is
// not claimed: the router and the route's page.tsx draw it.
import { screens as cycles } from '@/app/features/cycles/screen/host';
import { screens as fleet } from '@/app/features/fleet/screen/host';
import { screens as kit } from '@/app/features/kit/screen/host';
import { screens as ladder } from '@/app/features/ladder/screen/host';
import { screens as maturity } from '@/app/features/maturity/screen/host';
import { screens as monitor } from '@/app/features/monitor/screen/host';
import { screens as needsYou } from '@/app/features/needs-you/screen/host';
import { screens as onboard } from '@/app/features/onboard/screen/host';
import { screens as runs } from '@/app/features/runs/screen/host';
import { screens as settings } from '@/app/features/settings/screen/host';
import { screens as setup } from '@/app/features/setup/screen/host';
import { screens as start } from '@/app/features/start/screen/host';
import { screens as task } from '@/app/features/task/screen/host';
import { screens as theater } from '@/app/features/theater/screen/host';
import { screens as vitals } from '@/app/features/vitals/screen/host';
import { SCREEN_KEYS, type ScreenKey } from './model/routes';
import type { ScreenDef } from './model/types';

const ALL: readonly ScreenDef[] = [vitals, fleet, monitor, needsYou, ladder, maturity, cycles, task, start, onboard, setup, theater, runs, settings, kit].flat();

/** Each key's definition (the first one a module gives, should two name it: registry.test.ts forbids that). */
export const SCREENS: Readonly<Partial<Record<ScreenKey, ScreenDef>>> = Object.fromEntries(
  [...ALL].reverse().map((d) => [d.key, d]),
);

/** Every definition, in route-table order: the order the host's Activity boundaries render in (never reordered). */
export const SCREEN_ORDER: readonly ScreenDef[] = SCREEN_KEYS.flatMap((k) => (SCREENS[k] ? [SCREENS[k]] : []));

export function isReady(key: ScreenKey): boolean {
  return SCREENS[key]?.ready === true;
}

export function declaredSlices(key: ScreenKey): readonly string[] {
  return SCREENS[key]?.slices ?? [];
}

/** The slices that depend on the key's param (ScreenDef.paramSlices): another param re-reads only these. */
export function paramSlices(key: ScreenKey): readonly string[] {
  return SCREENS[key]?.paramSlices ?? [];
}

/** Every definition as the modules list them (tests: one per key, keys in the route table). */
export const ALL_SCREENS = ALL;
