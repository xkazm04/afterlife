import { describe, expect, it } from 'vitest';
import type { ClassRow } from '../../types';
import { MAX_CHANGES, trackChanges } from './batch';

const row = (id: string, track: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track, ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: null, lastMove: '', pending: null, ...o,
});

describe('trackChanges', () => {
  it('quarantines every acting class of the track, and only that track', () => {
    const classes = [row('dep-bump.patch', 'T1'), row('code-fix.patch', 'T1', { tier: 'supervised' }), row('pipeline.retry', 'T5')];
    expect(trackChanges(classes, 'T1', 'quarantine')).toEqual({
      changes: [{ id: 'dep-bump.patch', to: 'quarantined' }, { id: 'code-fix.patch', to: 'quarantined' }],
      skipped: [],
    });
  });

  it('one step takes each class one rung down from its own tier', () => {
    const classes = [row('pipeline.retry', 'T5'), row('test.quarantine', 'T5', { tier: 'supervised' })];
    expect(trackChanges(classes, 'T5', 'step')).toEqual({
      changes: [{ id: 'pipeline.retry', to: 'supervised' }, { id: 'test.quarantine', to: 'assisted' }],
      skipped: [],
    });
  });

  it('names every class it leaves alone and why: the server would refuse the whole write for any one of them', () => {
    const classes = [
      row('report.draft', 'T2'),
      row('report.submit', 'T2', { tier: 'human_only', ceiling: 'human_only' }),
      row('x', 'T2', { tier: 'quarantined', cell: 'no_record' }),
      row('q', 'T2', { tier: 'quarantined' }),
    ];
    const b = trackChanges(classes, 'T2', 'quarantine');
    expect(b.changes).toEqual([{ id: 'report.draft', to: 'quarantined' }]);
    expect(b.skipped).toEqual([
      { id: 'report.submit', why: 'never an agent' },
      { id: 'x', why: expect.stringMatching(/^no record yet/) },
      { id: 'q', why: 'already read and comment only' },
    ]);
    expect(b.refused).toBeUndefined();
  });

  it('refuses a track with more classes than one write takes, naming both counts, and plans no change', () => {
    const classes = Array.from({ length: 13 }, (_, i) => row(`c${i}`, 'T3'));
    const b = trackChanges(classes, 'T3', 'quarantine');
    expect(MAX_CHANGES).toBe(12);
    expect(b.changes).toEqual([]);
    expect(b.refused).toMatch(/13 classes/);
    expect(b.refused).toMatch(/12/);
  });
});
