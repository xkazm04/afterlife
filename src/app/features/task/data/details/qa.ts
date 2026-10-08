import type { TaskDetail } from '../../model/types';

/** 01J8QA, T7 QA: a bug found on the !41 review app. The "recheck" check has not run yet (unknown). */
export const QA: TaskDetail = {
  local: {
    id: '01J8QA',
    track: 'T7',
    cls: 'qa.file-bug',
    mr: '!41',
    title: 'Bug on the !41 review app: export filename drops the account suffix',
    tierAtTime: 'supervised',
    state: 'filed #131 · awaiting triage',
  },
  agent: 'ai-qa-acme',
  flowRun: 'flow run 7795',
  claimIds: ['c1', 'c2'],
  claims: ['the export filename drops the account suffix', 'not caused by !41 (also on main)'],
  chain: [
    { step: 'Event', obj: 'staging deploy of !41 · rev 00041', at: '14:06' },
    { step: 'Route', obj: 'flow ai-qa · tier read at policy sha a1b2c3', at: '14:06' },
    { step: 'Act', obj: 'qa job #9866 · explored 12 paths · 1 finding', at: '14:13' },
    { step: 'Prove', obj: 'proof-engine job #9868 · no model · scripted replay', at: '14:15' },
    { step: 'Decide', obj: 'SUPERVISED · bug filed, a person triages', at: '14:16' },
    { step: 'Deploy', obj: null, at: null },
    { step: 'Record', obj: 'ledger #486 · issue #131 with screenshot', at: '14:16' },
  ],
  chainRefs: ['env staging', 'policy @a1b2c3', 'job #9866', 'job #9868', 'issue #131', null, 'ledger #486'],
  proof: {
    cls: 'repro',
    verdict: 'PASS',
    engine: 'proof-engine v1',
    digest: 'sha256:9c1e…4b07',
    checks: [
      { id: 'replay', text: 'scripted browser replayed 4 steps: same outcome', ok: true, ref: 'job #9868' },
      { id: 'shot-hash', text: 'screenshot hash matches the filed one', ok: true, ref: 'sha256:51aa…e09c' },
      { id: 'on-base', text: 'reproduces on main too: not a regression of !41', ok: true, ref: 'pipeline #9867' },
      { id: 'recheck', text: 're-check after the next push: not run yet', ok: null, decidedBy: 'human', ref: 'scheduled' },
    ],
  },
  checkMap: {
    replay: [['c1'], 3],
    'shot-hash': [['c1'], 3],
    'on-base': [['c2'], 3],
    recheck: [['c1'], 6],
  },
  envelope: { files: 0, lines: 0, paths: [], within: true },
  agentWords: 'Steps: open /statements, pick account 0042-B, click Export. File is named statement-2026-10.csv, expected statement-2026-10-0042-B.csv. Same on main.',
  countsToward: 'qa.file-bug record: 16 of 15 accepted · 0 reverts · 14 clean days · meets the Hands-off rules, the promotion waits on Needs you',
  ledger: [
    [483, '14:06', 'task_started', 'explore staging rev 00041'],
    [485, '14:15', 'proof_verdict', 'repro · PASS · 3 / 3 run, 1 pending'],
    [486, '14:16', 'outcome', 'issue #131 filed'],
  ],
  trace: [
    '{"t":"14:07:03","step":"open","path":"/statements"}',
    '{"t":"14:11:40","step":"finding","kind":"wrong_filename"}',
    '{"t":"14:12:55","step":"screenshot","sha":"51aa…e09c"}',
  ],
};
