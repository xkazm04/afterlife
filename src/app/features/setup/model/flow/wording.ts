import type { ArmState, SetupState } from '../types';
import { needLabel, unmet } from './state';

/** The MR a track is armed by or waits on (or an enrollment opened), as GitLab named it; never a number GitLab did not give. */
export const mrName = (a: Pick<ArmState, 'mr' | 'simulated'>): string => a.mr ?? (a.simulated ? 'the simulated MR' : 'the MR');

/** Why an MR cannot be opened from here: a demo MR is only simulated, and GitLab may name an MR without giving its address. */
export const noMrAddress = (simulated: boolean, name: string): string =>
  simulated ? 'Demo mode opened no MR: there is nothing to open' : `GitLab gave no address for ${name}`;

/** The MR a person is asked to merge, said once for every place that names it: a revert says so, so a disarm never reads as an arm. */
export const mergeLabel = (a: ArmState): string => `${mrName(a)}${a.revert ? ' (revert)' : ''}`;

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

/** A step the operator said they did: never worded as done or probed. */
export const saidText = (at: string): string => `you said done ${at} · not read`;

export function stepTip(n: number, st: string, said?: string): string {
  return `Step ${n}${said && st === 'unknown' ? ` · ${saidText(said)}` : (STEP_TIP[st] ?? '')}`;
}
