// Test fixtures: the server's facts and the steps' input in the states the acceptance names (nothing probed, probe
// running, blocked at login, group derived from the repo, live pass, stack proposed and probing, saved, demo vs live,
// not local). Plain data, shared by the model, hook and every variant's render tests.
import type { DeriveAnswer } from '@/server/start/wire';
import type { StepInput } from '../steps/parts';
import { PROBE_IDLE, type ProbeState } from '../stream';
import type { NodeRead, StartFacts } from '../types';

export const LIVE: StartFacts = {
  mode: 'live', fake: false, groupId: '144060371', groupSet: true, host: 'gitlab.com', gate: null, rehearsal: false, reason: null, projects: 12,
  sources: { group: 'setting', mode: 'setting', host: 'unset' }, platform: 'windows',
};
export const DEMO: StartFacts = { ...LIVE, mode: 'demo', groupSet: false, groupId: '144060371', projects: null, sources: { group: 'unset', mode: 'unset', host: 'unset' } };

const pass = (line: string): NodeRead => ({ state: 'pass', line });
const CAPS = [{ id: 'mr-read', label: 'Read merge requests', status: 'available' as const, reason: '' }];

/** Every probe node passed, as a finished stream leaves it. */
export const PASSED: ProbeState = {
  ...PROBE_IDLE, stage: 'done', caps: CAPS,
  nodes: { glab: pass('glab starts and answers'), login: pass('signed in as @ops on gitlab.com'), group: pass('acme (id 144060371) · 12 projects'), live: pass('first poll finished: 12 projects'), doctor: pass('1 available · 0 unavailable · 0 unknown'), setup: pass('everything before it passes') },
};
/** The preflight stopped at the login. */
export const LOGIN_FAILED: ProbeState = {
  ...PROBE_IDLE, stage: 'done',
  nodes: { glab: pass('glab starts and answers'), login: { state: 'fail', line: 'glab is not logged in to gitlab.com' }, group: { state: 'wait', line: 'needs a signed-in glab first' } },
};

export const DERIVED: DeriveAnswer = { host: 'gitlab.com', groupPath: 'acme', groupId: '144060371', projectPath: 'acme/api' };

const TALLY0 = { saved: 0, total: 0, failed: 0 };

/** The steps' input: nothing picked, nothing probed, on a live server that already names its group. */
export function input(over: Partial<StepInput> = {}): StepInput {
  return {
    facts: LIVE,
    probe: { state: PROBE_IDLE, running: false, sinceS: 0 },
    repo: { local: true, deriving: false, sinceS: 0 },
    stack: { phase: 'pick', tally: TALLY0, running: null, total: 0, elapsedS: 0 },
    ...over,
  };
}

/** Repo picked and derived, every probe passed, the stack in `phase`. */
export function through(phase: StepInput['stack']['phase'], over: Partial<StepInput['stack']> = {}): StepInput {
  return input({
    probe: { state: PASSED, running: false, sinceS: 0 },
    repo: { local: true, deriving: false, sinceS: 0, picked: 'C:/src/api', name: 'api', derive: DERIVED },
    stack: { phase, tally: { saved: 5, total: 6, failed: 1 }, running: null, total: 6, elapsedS: 3, ...over },
  });
}
