// The outbox: every write waits here for Run. Pure list operations and the builders for what each decision stages.
import type { NeedsYouDemo } from '../../data/types';
import { CRA } from '../../data/cra';
import type { NeedsState, OutItem } from '../types';
import { gapItem } from './gap';
import { gapBlock } from '../../write/desk';
import { isPolicyKey, policyItem } from './policy';

/** Stage an item: replaces one with the same key, appends, and keeps the legal clock first in line (stable). */
export function stageItem(out: readonly OutItem[], item: OutItem): readonly OutItem[] {
  const next = [...out.filter((o) => o.key !== item.key), item];
  return next.sort((a, b) => Number(b.clock ?? false) - Number(a.clock ?? false));
}

export function unstageItem(out: readonly OutItem[], key: string): readonly OutItem[] {
  return out.filter((o) => o.key !== key);
}

/**
 * What a decision puts in the outbox. Null for a key that stages nothing (Retire and Not yet skip the outbox). A policy MR
 * (n1, n4) and a gap (g1..) carry the server's planned write from `writes`, or nothing to run until it has come.
 */
export function buildOutItem(key: string, demo: NeedsYouDemo, writes: NeedsState['writes'] = {}): OutItem | null {
  if (key === 'n2') {
    return { key, kind: 'CRA · on a clock', title: 'Mark the early warning ready to sign', ref: CRA.writeRef, commands: CRA.commands, clock: true };
  }
  if (isPolicyKey(key)) return policyItem(key, demo, writes[key]);
  const g = demo.gaps.find((x) => x.id === key);
  return g && !gapBlock(key, demo) ? gapItem(g, demo, writes[key]) : null;
}
