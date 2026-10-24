// The decision buttons are keyed by the item's kind, so a live item (id `readmit:<project>:<class>`) reads the same
// labels as the demo's n4, and every kind the inbox knows has its own pair.
import { describe, expect, it } from 'vitest';
import type { NeedsKind } from './deepTypes';
import { DEFAULT_NEEDS_ACTION, needsAction } from './needsActions';

const KINDS: readonly NeedsKind[] = ['promote', 'signoff', 'gaps', 'readmit', 'setup'];

describe('needsAction', () => {
  it('labels every kind with its own pair, never the default', () => {
    expect(KINDS.filter((k) => needsAction(k) === DEFAULT_NEEDS_ACTION)).toEqual([]);
  });

  it('keeps the demo items n1..n5 on their labels', () => {
    expect(KINDS.map(needsAction)).toEqual([
      ['Open policy MR', 'Not now'],
      ['Mark ready to sign', 'Open packet'],
      ['Pick gaps…', 'Later'],
      ['Re-admit at Assisted', 'Keep quarantined'],
      ['Open runner page', 'Later'],
    ]);
  });

  it('falls back to the default for a kind it does not know, including Object property names', () => {
    expect(['merge', 'toString', '__proto__'].map(needsAction)).toEqual([DEFAULT_NEEDS_ACTION, DEFAULT_NEEDS_ACTION, DEFAULT_NEEDS_ACTION]);
  });
});
