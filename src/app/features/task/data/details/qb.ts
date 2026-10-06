import type { TaskDetail } from '../../model/types';

/** 01J8QB, T5 medic: a runner flake retried on the same SHA. The dataset carries the rerun stats. */
export const QB: TaskDetail = {
  agent: 'ai-medic-acme',
  flowRun: 'flow run 7702',
  claimIds: ['c1', 'c2'],
  claims: ['runner flake, not a test failure', 'safe to retry on the same SHA'],
  chain: [
    { step: 'Event', obj: 'pipeline #9790 · accounts-service:test failed (job #9791)', at: '12:58' },
    { step: 'Route', obj: 'flow ai-medic · tier read at policy sha a1b2c3', at: '12:59' },
    { step: 'Act', obj: 'medic job #9795 · classified flake · 5 reruns of 7f3e21a', at: '13:00' },
    { step: 'Prove', obj: 'proof-engine job #9801 · no model · counts from job API', at: '13:04' },
    { step: 'Decide', obj: 'retry · pipeline #9790 green', at: '13:05' },
    { step: 'Deploy', obj: null, at: null },
    { step: 'Record', obj: 'ledger #470 · note on pipeline #9790', at: '13:05' },
  ],
  chainRefs: ['pipeline #9790', 'policy @a1b2c3', 'job #9795', 'job #9801', 'pipeline #9790', null, 'ledger #470'],
  proof: {
    cls: 'rerun-stats',
    verdict: 'PASS',
    engine: 'proof-engine v1',
    digest: 'sha256:9c1e…4b07',
    checks: [
      { id: 'same-sha', text: 'all 5 reruns on the same SHA 7f3e21a', ok: true, ref: 'job API' },
      { id: 'counts', text: 'recounted from job API: 5 of 5 passed', ok: true, ref: 'jobs #9796–#9800' },
      { id: 'signature', text: 'first failure is a runner error, no test assertion', ok: true, ref: 'job #9791 log' },
      { id: 'no-commit', text: 'no commit between the failure and the reruns', ok: true, ref: 'pipeline #9790' },
    ],
  },
  checkMap: {
    'same-sha': [['c2'], 2],
    counts: [['c1'], 3],
    signature: [['c1'], 0],
    'no-commit': [['c2'], 0],
  },
  envelope: { files: 0, lines: 0, paths: [], within: true },
  agentWords: 'Job 9791 died with "runner system failure: lost connection". No test ran to completion. Retrying the same SHA.',
  countsToward: 'pipeline.retry record: 19 accepted · 0 reverts · 14 clean days',
  ledger: [
    [466, '12:58', 'task_started', 'pipeline #9790 failed'],
    [467, '13:04', 'proof_verdict', 'rerun-stats · PASS · 5 / 5'],
    [468, '13:05', 'tier_decision', 'pipeline.retry HANDS-OFF · retried'],
    [470, '13:05', 'outcome', 'pipeline #9790 green'],
  ],
  trace: [
    '{"t":"12:59:40","step":"read_log","job":"#9791"}',
    '{"t":"13:00:12","step":"classify","label":"infra_flake"}',
    '{"t":"13:00:15","step":"rerun","n":5,"sha":"7f3e21a"}',
  ],
};
