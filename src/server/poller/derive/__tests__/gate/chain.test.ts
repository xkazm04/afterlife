// The poller and the engine's ledger-record checker read the next-rung trial with one rule (src/schemas/trial.ts). On a
// chain that is every fact there is (no task rows), the poller's trial counter and list are the checker's, MR for MR. With
// task rows, the poller resolves what GitLab states and the chain does not (edit facts, who closed an MR); the checker
// leaves those unresolved, never guesses them.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyChain } from '@/schemas/ledger';
import { parseLedgerJsonl } from '@/server/ledger/parse';
import { trialFromChain } from '../../../../../../engine/proofs/checkers/ledgerRecord';
import { recordOf } from '../../sources';
import type { CountedTask } from '../../counters';

const CHAIN = parseLedgerJsonl(fs.readFileSync(path.join(process.cwd(), 'engine', '__fixtures__', 'ledger', 'chain.jsonl'), 'utf8'));
const NOW = new Date('2026-10-06T14:22:00Z');
const SINCE = new Date('2026-09-20T08:00:00Z');
const H = { agent: 'ai-qa-acme-lab', classId: 'qa.file-bug', since: SINCE };
const poll = (tasks: CountedTask[]) => recordOf({ tasks, events: CHAIN, revertDemotes: true, ledgerRead: true }, H, NOW);

describe('the poller and the ledger-record checker agree on a chain', () => {
  it('the fixture chain verifies through the importer\'s parser, would included', () => {
    expect(verifyChain(CHAIN)).toBeNull();
    expect(CHAIN.filter((e) => e.would).length).toBe(7);
  });

  it('with no task rows, the trial counter and each MR\'s resolution are the checker\'s', () => {
    const checker = trialFromChain(CHAIN, { agent: H.agent, classId: H.classId, from: SINCE.getTime() });
    const { counters, sources } = poll([]);
    expect(counters.trial).toEqual({ n: checker.n, catches: checker.catches });
    expect(sources?.trial?.map((x) => [x.iid, x.resolution]).sort()).toEqual(checker.mrs.map((m) => [m.iid, m.resolution]).sort());
    expect(checker.mrs.map((m) => m.resolution)).toEqual(['no_edit_fact', 'no_edit_fact', 'open']);
  });

  it('with task rows the poller resolves what GitLab states: !201 and !202 unedited, !203 closed by a person', () => {
    const at = (d: string) => new Date(d);
    const tasks: CountedTask[] = [
      { agent: H.agent, actionClass: H.classId, state: 'merged', stateLabel: 'merged', startedAt: at('2026-10-01T09:00:00Z'), finishedAt: at('2026-10-01T11:00:00Z'), mrIid: 201, detail: { edited: false } },
      { agent: H.agent, actionClass: H.classId, state: 'merged', stateLabel: 'merged', startedAt: at('2026-10-02T09:00:00Z'), finishedAt: at('2026-10-02T11:00:00Z'), mrIid: 202, detail: { edited: false } },
      { agent: H.agent, actionClass: H.classId, state: 'closed', stateLabel: 'closed', startedAt: at('2026-10-03T09:00:00Z'), finishedAt: null, mrIid: 203, detail: { closedBy: { username: 'dev-ana', agent: false } } },
    ];
    expect(poll(tasks).counters.trial).toEqual({ n: 3, catches: 1 });
  });
});
