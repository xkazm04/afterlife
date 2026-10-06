import type { TaskDetail } from '../../model/types';

/** 01J8Q7, T6 maturity: Secure R2 to R3, merged by a person (ASSISTED), proven by a rescan. */
export const Q7: TaskDetail = {
  local: {
    id: '01J8Q7',
    track: 'T6',
    cls: 'ci-config.change',
    mr: '!42',
    title: 'Secure R2 → R3: security policy blocks critical findings',
    tierAtTime: 'assisted',
    state: 'merged by a person · rescanned',
  },
  agent: 'ai-maturity-acme',
  flowRun: 'flow run 7748',
  claimIds: ['c1', 'c2'],
  claims: ['Secure is now enforced (R3)', 'no other stage moved'],
  chain: [
    { step: 'Event', obj: 'gap g0 picked by a person · Secure R2 → R3', at: '13:31' },
    { step: 'Route', obj: 'flow ai-maturity · tier read at policy sha a1b2c3', at: '13:32' },
    { step: 'Act', obj: 'agent job #9851 · MR !42, 1 policy file, previewed', at: '13:38' },
    { step: 'Prove', obj: 'proof-engine job #9858 · no model · rescan, engine v1', at: '14:02' },
    { step: 'Decide', obj: 'ASSISTED · merged by a person at 13:55', at: '13:55' },
    { step: 'Deploy', obj: 'policy active on main · pipeline #9857', at: '13:57' },
    { step: 'Record', obj: 'ledger #474 · grid 6 → 7 stages with evidence', at: '14:02' },
  ],
  chainRefs: ['issue #126', 'policy @a1b2c3', 'job #9851', 'job #9858', 'MR !42', 'pipeline #9857', 'ledger #474'],
  proof: {
    cls: 'score-delta',
    verdict: 'PASS',
    engine: 'proof-engine v1',
    digest: 'sha256:9c1e…4b07',
    checks: [
      { id: 'same-engine', text: 'before and after scans by the same engine v1', ok: true, ref: 'scan 13:30 / 14:02' },
      { id: 'lift', text: 'Secure rung 2 → 3, outside the noise band', ok: true, ref: 'job #9858' },
      { id: 'evidence', text: 'policy enforced on a real pipeline, not only present', ok: true, ref: 'pipeline #9857' },
      { id: 'others', text: 'other 8 stages unchanged', ok: true, ref: 'job #9858' },
    ],
  },
  checkMap: {
    'same-engine': [[], 3],
    lift: [['c1'], 3],
    evidence: [['c1'], 5],
    others: [['c2'], 3],
  },
  envelope: { files: 1, lines: 12, paths: ['.gitlab/security-policies/policy.yml'], within: true },
  agentWords: 'Added a scan result policy that requires approval when a critical finding is present. Rescan should show Secure at R3.',
  countsToward: 'ci-config.change record: 5 accepted · 0 reverts · 10 clean days · ceiling ASSISTED',
  ledger: [
    [462, '13:32', 'task_started', 'gap Secure R2 → R3'],
    [463, '13:55', 'merged', 'ASSISTED · merged by a person'],
    [474, '14:02', 'proof_verdict', 'score-delta · PASS · R2 → R3'],
  ],
  trace: [
    '{"t":"13:33:10","step":"read_grid","stage":"secure","rung":2}',
    '{"t":"13:36:44","step":"write","file":"policy.yml","lines":12}',
    '{"t":"13:38:02","step":"open_mr","mr":"!42"}',
  ],
};
