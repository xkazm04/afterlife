// /start's eight steps, derived on every render from what is live now: the probe stream, the repo's derive answer, the
// stack's proposal and probes, the server's facts. Never stored. Pure. A step is done only when something was seen
// done; a check running now is `checking` with its own elapsed seconds; amber `you` only where a person must act.
import type { SetupAction } from '@/server/start/wire';
import { STEP_ORDER, stepOf, type StepFacts } from '../catalog';
import { unprobed } from '../judge';
import type { StepKey } from '../types';
import type { StepView } from '../view';
import { groupStep, liveStep, targetGroup } from './group';
import { fromNode, notCom, type Seen, type StepInput } from './parts';

export type { StepInput } from './parts';

function repoStep(i: StepInput): Seen {
  const r = i.repo;
  if (!r.local) return { state: 'blocked', line: r.note ?? 'repos are listed only on this machine: open Afterlife on localhost' };
  if (r.deriving) return { state: 'checking', line: 'reading the repo’s git remote…', checking: { what: 'the git remote', on: 'this machine', sinceS: r.sinceS } };
  if (!r.picked) return { state: 'you', line: 'pick a repo you work in with Claude Code' };
  const name = r.name ?? r.picked;
  if (r.error) return { state: 'done', line: `${name}: its remote could not be read (${r.error})` };
  if (!r.derive?.projectPath) return { state: 'done', line: `${name}: its remote is not on GitLab, so type the group id` };
  return { state: 'done', line: `${r.derive.projectPath} on ${r.derive.host}` };
}

function stackStep(i: StepInput): Seen {
  const s = i.stack;
  if (!i.repo.picked) return { state: 'todo', line: 'waits for a repo' };
  if (s.phase === 'proposing') return { state: 'checking', line: 'a low-effort model reads the repo…', checking: { what: 'the proposal', on: 'the model', sinceS: s.elapsedS } };
  if (s.phase === 'probing') {
    const what = s.running === null ? 'the lines' : `line ${s.running + 1} of ${s.total}`;
    return { state: 'checking', line: `${s.tally.saved} of ${s.tally.total} confirmed so far`, checking: { what, on: 'this machine', sinceS: s.elapsedS } };
  }
  if (s.phase === 'pick') return s.error ? { state: 'blocked', line: s.error.error } : { state: 'todo', line: 'waits for the proposal' };
  if (!s.tally.saved) return { state: 'blocked', line: 'no line was confirmed: fix a login, then Re-run' };
  if (s.savedAt) return { state: 'done', line: `${s.tally.saved} of ${s.tally.total} lines confirmed when it was saved, ${s.savedAt}` };
  return { state: 'done', line: `${s.tally.saved} of ${s.tally.total} lines confirmed${s.tally.failed ? `, ${s.tally.failed} failed` : ''}` };
}

function saveStep(i: StepInput): Seen {
  const s = i.stack;
  if (s.phase === 'saved') return { state: 'done', line: `saved as ${s.slug ?? 'the project'}${s.savedAt ? ` on ${s.savedAt}` : ''}: Vitals collects from it` };
  if (s.phase === 'saving') return { state: 'checking', line: 'saving the confirmed lines…', checking: { what: 'the save', on: 'Afterlife', sinceS: 0 } };
  if (s.phase === 'review' && s.error) return { state: 'blocked', line: s.error.error };
  if (s.phase === 'review' && s.tally.saved) return { state: 'you', line: `save the ${s.tally.saved} confirmed lines`, action: { kind: 'save-project' } };
  return { state: 'todo', line: 'waits for the confirmed lines' };
}

/** A blocked glab or login offers its catalogue action: the install (no package manager named on Linux), the login window. */
const ACTION_OF: Record<'glab' | 'login', (f: StepFacts) => SetupAction | undefined> = {
  glab: (f) => (f.platform === 'linux' ? undefined : { kind: 'install-glab' }),
  login: (f) => ({ kind: 'glab-login', ...notCom(f.host) }),
};

export function deriveSteps(i: StepInput): StepView[] {
  const { running, sinceS, state } = i.probe;
  const target = targetGroup(i);
  const f: StepFacts = { host: i.repo.derive?.host ?? i.facts.host, groupId: target ?? '', platform: i.facts.platform };
  const seen: Record<StepKey, Seen> = {
    repo: repoStep(i),
    glab: fromNode(state.nodes.glab, running, { what: 'glab', on: 'this machine' }, sinceS),
    login: fromNode(state.nodes.login, running, { what: 'glab login', on: 'GitLab' }, sinceS),
    group: groupStep(i, target),
    live: liveStep(i, target, state.nodes.live ?? unprobed(i.facts).live),
    stack: stackStep(i),
    save: saveStep(i),
    unlock: { state: 'todo', line: 'waits for every step before it' },
  };
  for (const k of ['glab', 'login'] as const) {
    const action = seen[k].state === 'blocked' ? ACTION_OF[k](f) : undefined;
    if (action) seen[k] = { ...seen[k], action };
  }
  const before = STEP_ORDER.filter((k) => k !== 'unlock');
  if (before.every((k) => seen[k].state === 'done')) seen.unlock = { state: 'done', line: 'everything before it is done: open the unlock map' };
  return STEP_ORDER.map((key) => {
    const e = stepOf(key);
    const s = seen[key];
    const caps = key === 'group' && state.caps.length ? state.caps : undefined;
    return { key, place: e.place, title: e.title, ...s, commands: s.state === 'done' ? [] : e.commands(f), detail: { probe: e.probe, ...(caps ? { caps } : {}) } };
  });
}

/** The first step not done: where a stepper opens. The last one when every step is done. */
export function currentOf(steps: readonly StepView[]): StepKey {
  return (steps.find((s) => s.state !== 'done') ?? steps[steps.length - 1])?.key ?? 'repo';
}
