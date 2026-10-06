import { ARM_META } from '../../data/armMeta';
import type { ArmState, SetupState } from '../types';
import { needLabel, unmet } from './state';

/** The exact command a click would send. Shown first; Belay writes only on a click. */
export const armCmd = (id: string, key: string): string =>
  `glab mr create --source-branch belay/arm-${key} --title "${ARM_META[id]?.title ?? id}"`;

export const disarmCmd = (id: string, key: string, mr: string | null): string =>
  `glab mr create --source-branch revert-arm-${key} --title "Revert ${mr ?? '!?'}: disarm ${(ARM_META[id]?.short ?? id).toLowerCase()}"`;

/** Why a track is in the state it is in: the tooltip on its node. */
export function trackWhy(s: SetupState, a: ArmState): string {
  switch (a.st) {
    case 'locked':
      return `locked · needs ${unmet(s, a.id).map(needLabel).join(', ')}`;
    case 'armed':
      return `armed · ${a.mr} · revert disarms`;
    case 'open':
      return `${a.revert ? 'revert ' : ''}${a.mr} open · waiting for your merge`;
    case 'probing':
      return 'probing main…';
    case 'ready':
      return 'ready · 1 MR';
  }
}

export function stepTip(n: number, st: string): string {
  return `Step ${n}${st === 'human' ? ' · only you' : st === 'done' ? ' · probed' : ''}`;
}
