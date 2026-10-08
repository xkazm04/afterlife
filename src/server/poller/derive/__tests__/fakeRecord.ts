// Shared by the record tests: tier-state.yml and belay-ledger in the demo GitLab, edited the way a person, the tripwire or
// the agents would leave them, so a poll counts a record from them with no mock between.
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ACCOUNT, LEDGERLINE_GID } from '@/server/gitlab/fake/demo/ids';
import { mr } from '@/server/gitlab/fake/demo/ledgerline';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';

export const DAY = 86_400_000;

const fileOf = (gl: FakeGitLab, project: string, path: string): { files: Record<string, string> } => {
  const p = gl.state.projects.find((x) => x.raw.name === project);
  if (!p || !(path in p.files)) throw new Error(`no ${path} in ${project}`);
  return p;
};

/** tier-state.yml as a person or the tripwire would leave it: `cls` (code-fix.patch) at `tier` since `since`. */
export function setTier(gl: FakeGitLab, tier: string, since: Date, cls = 'code-fix.patch'): void {
  const p = fileOf(gl, 'belay-policy', 'tier-state.yml');
  const text = p.files['tier-state.yml'] ?? '';
  const record = new RegExp(`${cls.replace(/[.]/g, '\\.')}: \\{[^}]*\\}`);
  p.files['tier-state.yml'] = text.replace(record, `${cls}: { tier: ${tier}, since: "${since.toISOString()}", by: "operator via promotion MR !40" }`);
  if (p.files['tier-state.yml'] === text) throw new Error(`${cls} is not in tier-state.yml`);
}

/**
 * Merge requests `author` opened in `cls` on ledgerline, merged within the hour before `now` (inside the poll's task
 * window, so each is read as a task with its notes). Each push note is GitLab's system note "added 1 commit", by the
 * account in `pushes` (the agent's own pushes, or a person's). Synthetic: written from GitLab's source, not recorded from
 * a run (a real one is the operator's to record, V-204).
 */
export function mergedMrs(gl: FakeGitLab, now: Date, author: string, cls: string, list: readonly { iid: number; pushes: readonly string[] }[]): void {
  const p = gl.state.projects.find((x) => x.raw.name === 'ledgerline');
  if (!p) throw new Error('no ledgerline');
  const at = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  for (const { iid, pushes } of list) {
    const sha = String(iid).padStart(40, 'e');
    p.mrs.push(mr({
      iid, title: `fix: issue ${iid}`, description: `Belay-Task: 01JNE${iid}\nBelay-Class: ${cls}`, author, state: 'merged',
      labels: ['proof::pass'], sha, created: at(60), updated: at(10), merged: at(10),
    }));
    p.notes[String(iid)] = pushes.map((by, n) => ({ id: iid * 100 + n, body: `added 1 commit\n\n<ul><li>${sha.slice(0, 8)} - fix</li></ul>\n\n[Compare with previous version](https://gitlab.example/-/merge_requests/${iid}/diffs)`, author: { username: by }, system: true, created_at: at(50 - n) }));
  }
}

/**
 * Events by the patcher in code-fix.patch (or `agent` in `cls`), appended to ledgerline's chain in belay-ledger: `kind`
 * on MR `iid`, `daysAgo` before `now`. A guardrail_verdict states `verdict` when given (the gate's, since it emits one); none: an older event.
 */
export function appendEvents(gl: FakeGitLab, now: Date, events: readonly { iid: number; daysAgo: number; kind?: LedgerEvent['kind']; verdict?: LedgerEvent['verdict']; agent?: string; cls?: string }[]): void {
  const path = `events/${LEDGERLINE_GID}.jsonl`;
  const p = fileOf(gl, 'belay-ledger', path);
  const chain: LedgerEvent[] = (p.files[path] ?? '').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerEvent);
  for (const { iid, daysAgo, kind = 'merged', verdict, agent = ACCOUNT.patcher, cls = 'code-fix.patch' } of events) {
    chain.push(append(chain, {
      at: new Date(now.getTime() - daysAgo * DAY).toISOString(), agent, action_class: cls, kind,
      tier_at_time: 'assisted', subject: { project_id: LEDGERLINE_GID, type: 'mr', iid }, payload_ref: `proofs/${iid}/${kind}.json`, observed_by: 'poll',
      ...(verdict ? { verdict } : {}),
    }));
  }
  p.files[path] = chain.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

/** Five merges of code-fix.patch by the patcher, one a day over the five days before `now`. */
export const mergeFive = (gl: FakeGitLab, now: Date): void => appendEvents(gl, now, [0, 1, 2, 3, 4].map((i) => ({ iid: 101 + i, daysAgo: 5 - i })));
