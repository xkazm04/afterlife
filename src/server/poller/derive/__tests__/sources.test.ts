// The outputs behind a record's counts come from the same tally as the counts: the window's merges are the accepted ones
// listed, the outputs before it are excluded and say why, an MR a task and a ledger event both state is one output, and a
// counter that is null names the MR whose fact is missing.
import { describe, expect, it } from 'vitest';
import { explain, promotion } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../counters';
import { recordOf } from '../sources';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const SINCE = new Date(NOW.getTime() - 10 * DAY);
const AGENT = 'ai-patcher-acme-lab';
const CLS = 'code-fix.patch';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

/** An output `days` ago: merged at finishedAt, closed and blocked at startedAt; no edit by anyone else unless said. */
const task = (iid: number, state: CountedTask['state'], days: number, over: Partial<CountedTask> = {}): CountedTask => ({
  agent: AGENT, actionClass: CLS, state, stateLabel: state, startedAt: ago(state === 'merged' ? days + 0.5 : days), finishedAt: state === 'merged' ? ago(days) : null,
  mrIid: iid, detail: state === 'merged' ? { edited: false } : {}, ...over,
});
const mergedEvent = (iid: number, days: number): CountedEvent =>
  ({ agent: AGENT, action_class: CLS, kind: 'merged', at: ago(days).toISOString(), subject: { project_id: 1, type: 'mr', iid } });

/**
 * Seven outputs in order, oldest first: !101 and !102 merged, then the last five: !103 merged, !104 closed, !105 merged
 * (its task row and a ledger merge both state it), !106 blocked by the guardrail, !107 merged.
 */
const seven =(): CounterSource => ({
  tasks: [task(101, 'merged', 7), task(102, 'merged', 6), task(103, 'merged', 5), task(104, 'closed', 4), task(105, 'merged', 3), task(106, 'blocked', 2), task(107, 'merged', 1)],
  events: [mergedEvent(105, 3)],
  revertDemotes: true,
  ledgerRead: true,
  web: 'https://gitlab.example/acme/ledgerline/',
});
const holder = { agent: AGENT, classId: CLS, since: SINCE, window: 5 };

describe('the outputs behind the counts (window_last 5)', () => {
  it('the rule reads accepted 3 / 5, and the sources list exactly those three merges as accepted', () => {
    const { counters, sources } = recordOf(seven(), holder, NOW);
    expect(counters).toEqual(countRecord(seven(), holder, NOW)); // one tally: the totals are countRecord's own
    expect(counters).toMatchObject({ accepted: 3, noEdit: 1, reverts: 0, guardrailBlocks: 1, window: 5, gated: 0 });
    const p = promotion({ tier: 'assisted', ceiling: 'hands_off', record: counters }, 'exploit-test', repoPolicy(), NOW);
    expect(p.kind === 'notyet' && p.rules.find((r) => r.name === 'accepted outputs')?.value).toBe('3 / 5');
    expect(sources?.outputs.filter((o) => o.inWindow && o.outcome === 'merged').map((o) => o.iid)).toEqual([107, 105, 103]);
    expect(explain('accepted', sources!).counted.map((l) => l.iid)).toEqual([107, 105, 103]);
    expect(sources).toMatchObject({ since: SINCE.toISOString(), window: 5, web: 'https://gitlab.example/acme/ledgerline', total: 7, blocks: [106] });
  });

  it('the two earlier outputs are excluded, outside the window', () => {
    const s = recordOf(seven(), holder, NOW).sources!;
    expect(s.excluded).toEqual([{ iid: 102, reason: 'outside_window' }, { iid: 101, reason: 'outside_window' }]);
    expect(s.outputs.map((o) => [o.iid, o.outcome, o.inWindow])).toEqual([
      [107, 'merged', true], [106, 'blocked', true], [105, 'merged', true], [104, 'closed', true], [103, 'merged', true], [102, 'merged', false], [101, 'merged', false],
    ]);
  });

  it('a task and a ledger event for the same MR count once', () => {
    const s = recordOf(seven(), holder, NOW).sources!;
    expect(s.outputs.filter((o) => o.iid === 105)).toHaveLength(1);
    const noEvent = { ...seven(), events: [] };
    expect(countRecord(noEvent, holder, NOW).accepted).toBe(3);
  });

  it('removing one merged output\'s edit fact makes noEdit null, and missing names that MR', () => {
    const src = seven();
    src.tasks = src.tasks.map((t) => (t.mrIid === 105 ? { ...t, detail: {} } : t));
    const { counters, sources } = recordOf(src, holder, NOW);
    expect(counters.noEdit).toBeNull();
    expect(sources?.missing.filter((m) => m.fact === 'edit')).toEqual([{ iid: 105, fact: 'edit' }]);
    expect(sources?.outputs.find((o) => o.iid === 105)?.edited).toBeNull();
    expect(explain('noEdit', sources!).missing).toEqual([{ iid: 105, text: 'no edit fact read yet' }]);
  });

  it('gated: each counted merge with no tier_decision is missing; without the ledger read, the record says so', () => {
    expect(recordOf(seven(), holder, NOW).sources?.missing.filter((m) => m.fact === 'tier_decision').map((m) => m.iid)).toEqual([107, 105, 103]);
    const unread = recordOf({ ...seven(), ledgerRead: false }, holder, NOW);
    expect(unread.counters.gated).toBeNull();
    expect(unread.sources?.missing).toContainEqual({ iid: null, fact: 'ledger' });
    expect(unread.sources?.outputs.every((o) => o.gated === null)).toBe(true);
  });

  it('no since: every counter null and no sources', () => {
    expect(recordOf(seven(), { ...holder, since: null }, NOW).sources).toBeNull();
  });
});
