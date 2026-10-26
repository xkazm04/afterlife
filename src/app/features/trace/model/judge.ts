// Turns what the probes saw into the wire's six node states. Pure. The doctor's blocker decides the first three nodes in
// its own order (binary > network > login > group); a node after a blocked one waits, it is never guessed.
import type { CapRow, NodeKey, NodeRead, TraceFacts } from './types';

/** The part of a belay doctor report the wire reads (src/server/gitlab/capabilities.ts DoctorReport). */
export interface ProbeSeen {
  blocker: { kind: 'binary' | 'network' | 'auth' | 'group'; text: string } | null;
  user: string | null;
  group: { fullPath: string } | null;
  projectCount: number | null;
  caps: CapRow[];
}

const wait = (line: string): NodeRead => ({ state: 'wait', line });

function liveNode(f: TraceFacts): NodeRead {
  if (f.mode === 'demo') return wait('BELAY_MODE is unset: this server serves the illustrative demo');
  if (f.gate === 'not-ready') return { state: 'fail', line: f.reason ?? 'BELAY_MODE=live, but the first poll has not finished' };
  if (f.gate === 'empty' || f.projects === 0) return { state: 'fail', line: 'the first poll finished and found 0 projects in the group' };
  return { state: 'pass', line: `first poll finished: ${f.projects ?? '?'} projects${f.fake ? ' in the seeded fake group' : ''}` };
}

/** Counts of the doctor's rows, in its three words. */
export function capCounts(caps: readonly CapRow[]): string {
  const n = (s: CapRow['status']) => caps.filter((c) => c.status === s).length;
  return `${n('available')} available · ${n('unavailable')} unavailable · ${n('unknown')} unknown`;
}

export function judge(seen: ProbeSeen, f: TraceFacts): Record<NodeKey, NodeRead> {
  const b = seen.blocker;
  const before = b && b.kind !== 'group';
  const glab: NodeRead = b?.kind === 'binary' ? { state: 'fail', line: b.text } : { state: 'pass', line: 'glab starts and answers' };
  const login: NodeRead =
    b?.kind === 'binary'
      ? wait('needs glab first')
      : b && (b.kind === 'network' || b.kind === 'auth')
        ? { state: 'fail', line: b.text }
        : seen.user
          ? { state: 'pass', line: `signed in as @${seen.user} on ${f.host}` }
          : { state: 'unknown', line: 'the user read did not answer' };
  const group: NodeRead = before
    ? wait('needs a signed-in glab first')
    : b?.kind === 'group'
      ? { state: 'fail', line: b.text }
      : seen.projectCount === 0
        ? { state: 'fail', line: `group ${seen.group?.fullPath ?? f.groupId} has 0 projects: add one, or pick another group` }
        : seen.group
          ? { state: 'pass', line: `${seen.group.fullPath} (id ${f.groupId}) · ${seen.projectCount ?? '?'} projects` }
          : { state: 'unknown', line: `group ${f.groupId} did not answer` };
  const live = liveNode(f);
  const doctor: NodeRead = before
    ? wait('blocked: every probe needs glab, the network and a login')
    : login.state === 'pass'
      ? { state: 'pass', line: capCounts(seen.caps) }
      : { state: 'unknown', line: `${capCounts(seen.caps)}, read without a confirmed login` };
  const ready = [glab, login, group, live, doctor].every((n) => n.state === 'pass');
  const setup: NodeRead = ready ? { state: 'pass', line: 'everything before it passes: open the unlock map' } : wait('waits for every node before it');
  return { glab, login, group, live, doctor, setup };
}

/** The first node that has not passed: where the wire is broken, and where the screen opens. */
export function firstOpen(nodes: Record<NodeKey, NodeRead>, order: readonly NodeKey[]): NodeKey {
  return order.find((k) => nodes[k].state !== 'pass') ?? order[order.length - 1] ?? 'glab';
}

/**
 * Before any probe: what the server knows alone (the live node), the rest not probed yet. Before the server's facts are
 * read (`f` absent) the live node is unknown too, its line a dash.
 */
export function unprobed(f?: TraceFacts): Record<NodeKey, NodeRead> {
  const u: NodeRead = { state: 'unknown', line: 'not probed yet: press Re-check' };
  const live: NodeRead = f ? liveNode(f) : { state: 'unknown', line: '—' };
  return { glab: u, login: u, group: u, live, doctor: u, setup: wait('waits for every node before it') };
}
