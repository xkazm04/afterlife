import { describe, expect, it } from 'vitest';
import { lane, repo, wave } from './wave.fixture';
import { LEDGER_INITIAL, ledgerCounts, ledgerRows, ledgerView } from './ledger';

const w1 = wave('alpha', 1, { lanes: [lane('cheap', { outcome: 'landed', costUsd: 0.1 }), lane('dear', { outcome: 'failed', costUsd: 0.9 }), lane('silent', { outcome: 'landed' })] });
const w2 = wave('beta', 2, { lanes: [lane('mid', { outcome: 'parked', costUsd: 0.5, title: 'A mid lane' }), lane('busy')] });
const rows = ledgerRows([repo('alpha', [w1]), repo('beta', [w2])]);

describe('every lane as one row', () => {
  it('flattens every wave of every repo, each lane with its wave', () => {
    expect(rows.map((r) => r.lane.lane)).toEqual(['cheap', 'dear', 'silent', 'mid', 'busy']);
    expect(rows[3]!.wave).toBe(w2);
  });

  it('the filter offers all, then each kind that has a lane, with counts', () => {
    expect(ledgerCounts(rows)).toEqual([
      { value: 'all', count: 5 },
      { value: 'landed', count: 2 },
      { value: 'failed', count: 1 },
      { value: 'parked', count: 1 },
      { value: 'open', count: 1 },
    ]);
  });

  it('costliest first by default; a lane that reported no cost sinks, whatever the direction', () => {
    expect(ledgerView(rows, 'all', LEDGER_INITIAL).map((r) => r.lane.lane)).toEqual(['dear', 'mid', 'cheap', 'silent', 'busy']);
    expect(ledgerView(rows, 'all', { key: 'cost', dir: 1 }).map((r) => r.lane.lane).slice(-2)).toEqual(['silent', 'busy']);
  });

  it('narrows to an outcome and to one wave', () => {
    expect(ledgerView(rows, 'landed', LEDGER_INITIAL).map((r) => r.lane.lane)).toEqual(['cheap', 'silent']);
    expect(ledgerView(rows, 'all', LEDGER_INITIAL, w2).map((r) => r.lane.lane)).toEqual(['mid', 'busy']);
    expect(ledgerView(rows, 'open', LEDGER_INITIAL, w1)).toEqual([]);
  });

  it('sorts by title in words, the lane id standing in for a missing title', () => {
    expect(ledgerView(rows, 'all', { key: 'title', dir: 1 }).map((r) => r.lane.lane)).toEqual(['mid', 'busy', 'cheap', 'dear', 'silent']);
  });
});
