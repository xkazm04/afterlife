// The outbox: every write waits here for Run. Pure list operations and the builders for what each decision stages.
import type { NeedsYouDemo } from '../../data/types';
import { CRA } from '../../data/cra';
import { GAP_DETAIL } from '../../data/gaps';
import { PROMOTE } from '../../data/promote';
import { READMIT } from '../../data/readmit';
import type { OutItem } from '../types';
import { gapCommand } from './commands';

/** Stage an item: replaces one with the same key, appends, and keeps the legal clock first in line (stable). */
export function stageItem(out: readonly OutItem[], item: OutItem): readonly OutItem[] {
  const next = [...out.filter((o) => o.key !== item.key), item];
  return next.sort((a, b) => Number(b.clock ?? false) - Number(a.clock ?? false));
}

export function unstageItem(out: readonly OutItem[], key: string): readonly OutItem[] {
  return out.filter((o) => o.key !== key);
}

/** What a decision puts in the outbox. Null for a key that stages nothing (Retire and Not yet skip the outbox). */
export function buildOutItem(key: string, demo: NeedsYouDemo): OutItem | null {
  if (key === 'n2') {
    return { key, kind: 'CRA · on a clock', title: 'Mark the early warning ready to sign', ref: CRA.writeRef, commands: CRA.commands, clock: true };
  }
  if (key === 'n1') {
    const w = PROMOTE.write;
    return { key, kind: 'policy MR', title: 'Promote dep-bump.patch to Hands-off', ref: w.ref, commands: w.commands, file: w.file, diff: w.diff };
  }
  if (key === 'n4') {
    const w = READMIT.readmit;
    return { key, kind: 'policy MR', title: 'Re-admit patch-bump as Assisted', ref: w.ref, commands: w.commands, file: w.file, diff: w.diff };
  }
  const g = demo.gaps.find((x) => x.id === key);
  if (!g) return null;
  return {
    key,
    kind: g.diffLines ? 'gap MR' : 'gap issue',
    title: `${g.stage}: ${g.title}`,
    ref: GAP_DETAIL.mrNo[g.id] ?? '',
    commands: [gapCommand(g, demo.rungNames)],
  };
}
