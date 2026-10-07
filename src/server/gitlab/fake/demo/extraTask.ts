// One more agent MR on ledgerline, outside the demo's story: task 01J8QD, which the Task screen has no fixture for (it is
// not in TASK_ORDER), so its page is drawn from what the poller derived alone. Opt-in (`createDemoGitLab(anchor,
// { extraTask: true })`): by default the demo GitLab replays the demo exactly, which parity.test.ts relies on.
// Its Proof Block is its own, not the 01J8Q4 fixture's: each check answers the claim it tests, the envelope check none.
import type { ProofBlock } from '@/schemas/proof';
import type { Rec } from '../../adapter/fields';
import { ACCOUNT, LEDGERLINE_GID } from './ids';
import { at, mr, note } from './ledgerline';
import { proofNote } from './notes';

export const EXTRA_TASK = { id: '01J8QD', iid: 45, sha: 'a45c0ffee00000000000000000000000000000a5' } as const;

function block(): ProofBlock {
  return {
    schema: 'belay.proof/1', id: `${EXTRA_TASK.id}PROOF`.padEnd(26, '0'), class: 'bench-delta',
    task: { flow: 'patcher', run_id: 'pipeline-9903', project_id: LEDGERLINE_GID, mr_iid: EXTRA_TASK.iid, head_sha: EXTRA_TASK.sha, trailer: `Belay-Task: ${EXTRA_TASK.id}` },
    claims: [
      { id: 'c1', text: 'jackson-databind moves 2.17.1 → 2.17.2, a patch release' },
      { id: 'c2', text: 'the test suite stays green at head' },
    ],
    checks: [
      { claim_id: 'c1', name: 'lockfile-patch', ok: true, detail: 'the version catalog moves jackson-databind 2.17.1 → 2.17.2 and nothing else', ref: 'MR !45 diff' },
      { claim_id: 'c2', name: 'head-green', ok: true, detail: 'head pipeline green, same test ids as base', ref: 'job #9902' },
      { claim_id: null, name: 'inside-envelope', ok: true, detail: '1 file, 2 lines, no denied path', ref: 'trust-policy.yml' },
    ],
    evidence: [{ kind: 'job', ref: 'job #9902' }, { kind: 'commit', ref: EXTRA_TASK.sha }],
    verdict: 'pass', envelope: { files: 1, lines: 2, paths_touched: ['gradle/libs.versions.toml'], within: true },
    engine: { version: 'v1', sha256: '9c1e…4b07' },
  };
}

/** The MR (opened, proved, awaiting merge) and its notes, keyed as ProjectData keeps them. */
export function extraTaskMr(anchor: Date): { mr: Rec; notes: Record<string, Rec[]> } {
  return {
    mr: mr({
      iid: EXTRA_TASK.iid, title: 'Bump jackson-databind 2.17.1 → 2.17.2', author: ACCOUNT.patcher, state: 'opened',
      description: `Patch release; ledgerline uses no API it changes.\n\nBelay-Task: ${EXTRA_TASK.id}\nBelay-Class: dep-bump.patch`,
      labels: ['proof::pass', 'guardrail::pass', 'belay::tier::hands_off'], sha: EXTRA_TASK.sha, created: at(anchor, '13:30'), updated: at(anchor, '13:52'),
    }),
    notes: { [String(EXTRA_TASK.iid)]: [note(910_003, ACCOUNT.proof, proofNote(block()), at(anchor, '13:51'))] },
  };
}
