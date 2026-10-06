import type { TaskDetail } from '../../model/types';

/** 01J8QC, T2 CRA: an early-warning draft. One check ("wording") is not machine-checkable: a person reads it. */
export const QC: TaskDetail = {
  agent: 'ai-cra-acme',
  flowRun: 'flow run 7760',
  claimIds: ['c1', 'c2', 'c3'],
  awareAt: '09:34',
  claims: ['V-211 is actively exploited (seeded)', 'statements-service 4.2.0 is the affected release', 'a mitigation is available'],
  chain: [
    { step: 'Event', obj: 'vulnerability V-211 flagged actively exploited (seeded)', at: '13:56' },
    { step: 'Route', obj: 'flow ai-cra · tier read at policy sha a1b2c3', at: '13:57' },
    { step: 'Act', obj: 'agent job #9862 · early-warning packet drafted', at: '14:05' },
    { step: 'Prove', obj: 'proof-engine job #9864 · no model · 6 / 6 links resolve', at: '14:07' },
    { step: 'Decide', obj: 'graded reviewable · waits for a person to sign', at: '14:07' },
    { step: 'Deploy', obj: null, at: null },
    { step: 'Record', obj: 'ledger #484 · packet on issue #130', at: '14:08' },
  ],
  chainRefs: ['vuln V-211', 'policy @a1b2c3', 'job #9862', 'job #9864', 'issue #130', null, 'ledger #484'],
  proof: {
    cls: 'linked-evidence',
    verdict: 'PASS',
    engine: 'proof-engine v1',
    digest: 'sha256:9c1e…4b07',
    checks: [
      { id: 'links', text: 'every statement links to a GitLab object: 6 / 6 resolve by API', ok: true, ref: 'job #9864' },
      { id: 'clock', text: 'clock recomputed: aware 09:34 + 24 h = due 09:34 tomorrow', ok: true, ref: 'cra.ts due()' },
      { id: 'release', text: 'affected release 4.2.0 matches the SBOM asset', ok: true, ref: 'release 4.2.0' },
      { id: 'wording', text: 'legal wording: not machine-checkable, a person reads it', ok: null, decidedBy: 'human', ref: 'sign-off' },
    ],
  },
  checkMap: {
    links: [['c1', 'c3'], 3],
    clock: [['c1'], 0],
    release: [['c2'], 3],
    wording: [[], 4],
  },
  envelope: { files: 0, lines: 0, paths: [], within: true },
  agentWords: 'Draft early warning for V-211. Exploitation reported by the scanner feed (seeded). Affected: statements-service 4.2.0. Mitigation: !41 is in production.',
  countsToward: 'report.draft record: 4 accepted · 0 reverts · 12 clean days · report.submit stays HUMAN ONLY',
  ledger: [
    [471, '13:56', 'clock_event', 'aware_at 09:34 · early warning due in 24 h'],
    [472, '14:05', 'task_started', 'packet drafted on issue #130'],
    [473, '14:07', 'proof_verdict', 'linked-evidence · PASS · 6 / 6 links'],
    [484, '14:08', 'outcome', 'graded reviewable · awaiting sign-off'],
  ],
  trace: [
    '{"t":"14:01:10","step":"read_vuln","ref":"V-211"}',
    '{"t":"14:03:52","step":"draft","section":"early_warning","links":6}',
    '{"t":"14:05:02","step":"post","issue":"#130"}',
  ],
};
