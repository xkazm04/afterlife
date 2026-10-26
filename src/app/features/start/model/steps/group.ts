// The group and live steps: which group the wizard works on (the repo's remote names it; else a typed id; else the
// server's own when something set it), and whether the server already watches it, live. A group the env sets is never
// offered a set-setup over it: the env wins (server/env), so the step says to unset it instead.
import type { NodeRead } from '../types';
import { fromNode, setSetup, type Seen, type StepInput } from './parts';

/** The group the steps work on, or null while nothing names one. The seeded fake group always counts as named. */
export function targetGroup(i: StepInput): string | null {
  const own = i.facts.groupSet || i.facts.fake ? i.facts.groupId : null;
  return i.repo.derive?.groupId ?? i.typedGroup ?? own;
}

/** The target is not the group this server already watches (or the server names none of its own). */
const switching = (i: StepInput, target: string): boolean => !i.facts.fake && (!i.facts.groupSet || target !== i.facts.groupId);

export function groupStep(i: StepInput, target: string | null): Seen {
  const d = i.repo.derive;
  const host = d?.host ?? i.facts.host;
  if (target && switching(i, target)) {
    if (i.facts.sources.group === 'env') return { state: 'blocked', line: `the env sets group ${i.facts.groupId}; unset AFTERLIFE_GROUP_ID to watch ${target}` };
    const named = d?.groupId === target && d.groupPath ? `${d.groupPath} is group ${target}` : `group ${target}`;
    return { state: 'you', line: `${named}: set it, live`, action: setSetup(target, host) };
  }
  if (target) return fromNode(i.probe.state.nodes.group, i.probe.running, { what: `group ${target}`, on: 'GitLab' }, i.probe.sinceS);
  if (d?.groupPath) return { state: 'you', line: d.reason ?? `the id of ${d.groupPath} could not be read: type it`, input: 'group-id' };
  if (i.repo.local && !i.repo.picked) return { state: 'todo', line: 'the repo’s remote names it, or type its id', input: 'group-id' };
  return { state: 'you', line: 'type the group’s numeric id (its overview page shows it)', input: 'group-id' };
}

export function liveStep(i: StepInput, target: string | null, read: NodeRead): Seen {
  if (!target || switching(i, target)) return { state: 'todo', line: 'waits for the group' };
  if (i.facts.mode === 'demo') {
    if (i.facts.sources.mode === 'env') return { state: 'blocked', line: 'the env sets demo mode; unset AFTERLIFE_MODE to go live' };
    return { state: 'you', line: 'this server serves the demo: switch it to live', action: setSetup(target, i.repo.derive?.host ?? i.facts.host) };
  }
  if (read.state === 'pass') return { state: 'done', line: read.line };
  if (i.facts.gate === 'not-ready') return { state: 'checking', line: read.line, checking: { what: 'the first poll', on: 'Afterlife', sinceS: i.probe.sinceS } };
  return { state: read.state === 'fail' ? 'blocked' : 'todo', line: read.line };
}
