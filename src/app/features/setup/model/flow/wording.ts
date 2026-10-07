import type { ArmState, SetupState } from '../types';
import { needLabel, unmet } from './state';

/** The MR a track is armed by or waits on, as GitLab named it; never a number GitLab did not give. */
export const mrName = (a: ArmState): string => a.mr ?? (a.simulated ? 'the simulated MR' : 'the MR');

/** Why a track is in the state it is in: the tooltip on its node. */
export function trackWhy(s: SetupState, a: ArmState): string {
  switch (a.st) {
    case 'locked':
      return `locked · needs ${unmet(s, a.id).map(needLabel).join(', ')}`;
    case 'armed':
      return `armed${a.mr ? ` · ${a.mr}` : ''}${a.simulated ? ' (simulated)' : ''} · revert disarms`;
    case 'open':
      return `${a.revert ? 'revert ' : ''}${mrName(a)} open · waiting for your merge`;
    case 'probing':
      return 'probing main…';
    case 'ready':
      return 'ready · 1 MR';
    case 'undefined':
      return 'not defined yet · the repo has no arm content for it';
    case 'unknown':
      return `unknown · ${a.found ?? 'the read of main failed'}`;
  }
}

const STEP_TIP: Readonly<Record<string, string>> = { human: ' · only you', done: ' · probed', failed: ' · probed · not yet', unknown: ' · unknown' };

export function stepTip(n: number, st: string): string {
  return `Step ${n}${STEP_TIP[st] ?? ''}`;
}
