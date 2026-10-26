// StartView fixtures for every variant's render tests: the same steps (derived by the real deriveSteps from the input
// fixtures), with no-op functions. VIEWS names the states the acceptance lists; a variant renders each one.
import type { ProbeState } from '../stream';
import { PROBE_IDLE } from '../stream';
import { currentOf, deriveSteps } from '../steps/derive';
import type { StepInput } from '../steps/parts';
import type { StartView } from '../view';
import { LOGIN_FAILED, input, through } from './input';

const noop = () => {};

/** A whole StartView over a steps input, every function a no-op; `over` sets anything else. */
export function viewOf(i: StepInput, over: Partial<StartView> = {}): StartView {
  const steps = deriveSteps(i);
  const current = currentOf(steps);
  return {
    steps, current, selected: current, select: noop,
    running: i.probe.running, elapsedS: i.probe.sinceS, slow: i.probe.sinceS >= 12, refused: i.probe.state.refused, at: i.probe.state.read?.at ?? null,
    source: { mode: i.facts.mode, fake: i.facts.fake, host: i.facts.host, group: i.facts.groupId, sources: i.facts.sources },
    gate: i.facts.gate, rehearsal: i.facts.rehearsal,
    recheck: noop, run: noop, setGroup: noop, pending: null,
    repo: { repos: [], picked: i.repo.picked, note: i.repo.note, pick: noop },
    stack: { groups: [], tally: i.stack.tally, phase: i.stack.phase, rerun: noop, save: noop, ...(i.stack.slug ? { slug: i.stack.slug } : {}) },
    chat: { open: false, toggle: noop, turns: [], ask: noop, thinking: false, elapsedS: 0, propose: noop },
    path: 'hand', setPath: noop,
    ...over,
  };
}

const running = (sinceS: number): StepInput => input({ probe: { state: { ...PROBE_IDLE, stage: 'preflight' } as ProbeState, running: true, sinceS } });

/** The states every variant renders: nothing probed, checking (4 s, and slow at 14 s), blocked at login, probing the stack, all done. */
export const VIEWS = {
  nothing: viewOf(input()),
  checking: viewOf(running(4), { selected: 'glab' }),
  slow: viewOf(running(14), { selected: 'login' }),
  blocked: viewOf(input({ probe: { state: LOGIN_FAILED, running: false, sinceS: 0 } }), { selected: 'login' }),
  probing: viewOf(through('probing', { running: 1, tally: { saved: 1, total: 6, failed: 0 } })),
  done: viewOf(through('saved', { slug: 'acme-api' })),
} satisfies Record<string, StartView>;
