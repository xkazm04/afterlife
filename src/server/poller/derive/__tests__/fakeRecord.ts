// Shared by the record tests: tier-state.yml and belay-ledger in the demo GitLab, edited the way a person, the tripwire or
// the agents would leave them, so a poll counts a record from them with no mock between.
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ACCOUNT, LEDGERLINE_GID } from '@/server/gitlab/fake/demo/ids';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';

export const DAY = 86_400_000;

const fileOf = (gl: FakeGitLab, project: string, path: string): { files: Record<string, string> } => {
  const p = gl.state.projects.find((x) => x.raw.name === project);
  if (!p || !(path in p.files)) throw new Error(`no ${path} in ${project}`);
  return p;
};

/** tier-state.yml as a person or the tripwire would leave it: code-fix.patch at `tier` since `since`. */
export function setTier(gl: FakeGitLab, tier: string, since: Date): void {
  const p = fileOf(gl, 'belay-policy', 'tier-state.yml');
  const text = p.files['tier-state.yml'] ?? '';
  p.files['tier-state.yml'] = text.replace(/code-fix\.patch: \{[^}]*\}/, `code-fix.patch: { tier: ${tier}, since: "${since.toISOString()}", by: "operator via promotion MR !40" }`);
  if (p.files['tier-state.yml'] === text) throw new Error('code-fix.patch is not in tier-state.yml');
}

/**
 * Events by the patcher in code-fix.patch, appended to ledgerline's chain in belay-ledger: `kind` on MR `iid`, `daysAgo`
 * before `now`. A guardrail_verdict states `verdict` when given (the gate's, since it emits one); none: an older event.
 */
export function appendEvents(gl: FakeGitLab, now: Date, events: readonly { iid: number; daysAgo: number; kind?: LedgerEvent['kind']; verdict?: LedgerEvent['verdict'] }[]): void {
  const path = `events/${LEDGERLINE_GID}.jsonl`;
  const p = fileOf(gl, 'belay-ledger', path);
  const chain: LedgerEvent[] = (p.files[path] ?? '').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerEvent);
  for (const { iid, daysAgo, kind = 'merged', verdict } of events) {
    chain.push(append(chain, {
      at: new Date(now.getTime() - daysAgo * DAY).toISOString(), agent: ACCOUNT.patcher, action_class: 'code-fix.patch', kind,
      tier_at_time: 'assisted', subject: { project_id: LEDGERLINE_GID, type: 'mr', iid }, payload_ref: `proofs/${iid}/${kind}.json`, observed_by: 'poll',
      ...(verdict ? { verdict } : {}),
    }));
  }
  p.files[path] = chain.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

/** Five merges of code-fix.patch by the patcher, one a day over the five days before `now`. */
export const mergeFive = (gl: FakeGitLab, now: Date): void => appendEvents(gl, now, [0, 1, 2, 3, 4].map((i) => ({ iid: 101 + i, daysAgo: 5 - i })));
