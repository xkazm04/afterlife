// The cells of a decision row as data (the table draws them). Titles come from the shared demo dataset.
import type { TierKey } from '@/lib/demo/types';
import { CRA } from '../../data/cra';
import { GAP_DETAIL } from '../../data/gaps';
import { PROMOTE } from '../../data/promote';
import { READMIT } from '../../data/readmit';
import { RUNNER } from '../../data/runner';
import type { NeedsYouDemo } from '../../data/types';
import { gradeIndex } from '../clock/grades';
import { GRADES } from '../../data/cra';
import type { NeedsState } from '../types';
import { isGapId } from './rowState';

export type MoveView =
  | { kind: 'tiers'; from: TierKey; to: TierKey }
  | { kind: 'rungs'; from: number; to: number }
  | { kind: 'grade'; label: string; done: boolean }
  | { kind: 'chip'; label: string; tone: 'plain' | 'ok' | 'unknown'; title?: string };
export type WritesView = { kind: 'text'; text: string } | { kind: 'issue' } | { kind: 'none' };

export interface RowView {
  title: string;
  /** The row carries the "seeded" chip. */
  seeded?: boolean;
  move: MoveView;
  writes: WritesView;
  track: string;
  /** The opened-at time; absent on the row that shows the live countdown. */
  when?: string;
  /** The row's When cell is the live countdown. */
  due?: boolean;
  /** The row has a pick checkbox. */
  pick?: boolean;
}

export function rowView(s: NeedsState, id: string, demo: NeedsYouDemo): RowView | null {
  if (isGapId(id)) {
    const g = demo.gaps.find((x) => x.id === id);
    if (!g) return null;
    return {
      title: `${g.stage} · ${g.title}`,
      move: { kind: 'rungs', from: g.from, to: g.to },
      writes: g.diffLines ? { kind: 'text', text: `draft MR · ${g.diffLines} l` } : { kind: 'issue' },
      track: 'T6',
      when: GAP_DETAIL.openedAt,
      pick: true,
    };
  }
  if (id === 'n2') {
    const gi = gradeIndex(s.status.n2);
    return {
      title: `CRA early warning · ${CRA.vuln}`,
      seeded: true,
      move: { kind: 'grade', label: GRADES[gi]?.name ?? '', done: gi === 2 },
      writes: { kind: 'text', text: 'label + note' },
      track: 'T2',
      due: true,
    };
  }
  if (id === 'n1') {
    return {
      title: demo.promote.title,
      move: { kind: 'tiers', from: demo.promote.from, to: demo.promote.to },
      writes: { kind: 'text', text: 'policy MR' },
      track: PROMOTE.track,
      when: PROMOTE.openedAt,
    };
  }
  if (id === 'n4') {
    return {
      title: demo.readmit.title,
      seeded: true,
      move: s.status.n4 === 'retired' ? { kind: 'chip', label: 'retired', tone: 'plain' } : { kind: 'tiers', from: 'quarantined', to: 'assisted' },
      writes: { kind: 'text', text: 'policy MR' },
      track: READMIT.track,
      when: READMIT.openedAt,
    };
  }
  if (id === 'n5') {
    return {
      title: demo.runner.title,
      move: s.runner.check === 'ok' ? { kind: 'chip', label: 'online', tone: 'ok' } : { kind: 'chip', label: '? runner', tone: 'unknown', title: 'Unknown · checked 2 h ago' },
      writes: { kind: 'none' },
      track: '—',
      when: RUNNER.openedAt,
    };
  }
  return null;
}
