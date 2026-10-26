// The steps' shared parts: what derive reads (StepInput), a step's seen state, and a probe node read as a step. Pure.
import type { DeriveAnswer, SetSetup } from '@/server/start/wire';
import type { OnboardError } from '@/server/discover/wire';
import type { ProbeState } from '../stream';
import type { NodeRead, StartFacts } from '../types';
import type { Checking, StackView, StepView } from '../view';

export interface StepInput {
  facts: StartFacts;
  probe: { state: ProbeState; running: boolean; sinceS: number };
  repo: { local: boolean; note?: string; picked?: string; name?: string; deriving: boolean; derive?: DeriveAnswer; error?: string; sinceS: number };
  /** A group id the person typed, when no repo named one. */
  typedGroup?: string;
  stack: { phase: StackView['phase']; tally: StackView['tally']; running: number | null; total: number; elapsedS: number; error?: OnboardError; slug?: string };
}

export type Seen = Pick<StepView, 'state' | 'line' | 'checking' | 'action' | 'input'>;

/** A probe node as a step: its own read once it arrived, `checking` while the stream runs without it. */
export function fromNode(r: NodeRead | undefined, running: boolean, c: Omit<Checking, 'sinceS'>, sinceS: number): Seen {
  if (r?.state === 'pass') return { state: 'done', line: r.line };
  if (r?.state === 'fail') return { state: 'blocked', line: r.line };
  if (r?.state === 'wait') return { state: 'todo', line: r.line };
  if (running) return { state: 'checking', line: `checking ${c.what}…`, checking: { ...c, sinceS } };
  return { state: 'todo', line: r?.line ?? 'not checked yet: press Re-check' };
}

export const notCom = (host: string): { host?: string } => (host === 'gitlab.com' ? {} : { host });

/** The set-setup a step offers: the group, live, the host when it is not gitlab.com. */
export const setSetup = (groupId: string, host: string): SetSetup => ({ kind: 'set-setup', groupId, mode: 'live', ...notCom(host) });
