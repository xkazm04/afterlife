import type { TaskDetail } from '../../model/types';

/** 01J8Q4, T1 patcher: the dataset carries its chain, proof and claims. */
export const Q4: TaskDetail = {
  agent: 'ai-patcher-acme',
  flowRun: 'flow run 7731',
  claimIds: ['c1', 'c2'],
  chainRefs: ['pipeline #9812', 'policy @a1b2c3', 'job #9830', 'job #9841', 'MR !41', 'rev 00042', 'ledger #482'],
  checkMap: {
    'base-red': [['c1'], 2],
    'head-green': [['c1'], 3],
    'not-weakened': [['c1'], 3],
    envelope: [[], 1],
    rescan: [['c1'], 3],
  },
  envelope: {
    files: 2,
    lines: 14,
    paths: ['src/main/kotlin/statements/StatementExportController.kt', 'src/test/kotlin/statements/ExportTraversalTest.kt'],
    within: true,
  },
  ledger: [
    [476, '09:02', 'task_started', 'finding V-204 on pipeline #9812'],
    [477, '09:14', 'task_started', 'agent job #9830 · red test pushed'],
    [478, '09:27', 'proof_verdict', 'exploit-test · PASS · 5 / 5 checks'],
    [479, '09:28', 'guardrail_verdict', 'no objection · 0 quoted hunks'],
    [480, '09:29', 'merged', 'tier gate: HANDS-OFF · merged, no human click'],
    [481, '09:51', 'outcome', 'production rev 00042 · QA 12 paths · 0 regressions'],
    [482, '09:52', 'outcome', 'OpenVEX asset · summary on #128'],
  ],
  trace: [
    '{"t":"09:14:02","step":"read_finding","ref":"V-204"}',
    '{"t":"09:16:40","step":"write_test","file":"ExportTraversalTest.kt"}',
    '{"t":"09:18:11","step":"push","pipeline":"#9830","status":"failed"}',
    '{"t":"09:22:57","step":"write_patch","files":2,"lines":14}',
    '{"t":"09:24:30","step":"push","pipeline":"#9841","status":"running"}',
  ],
};
