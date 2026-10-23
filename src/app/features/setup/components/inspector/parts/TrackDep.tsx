'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { mergeLabel } from '../../../model/flow/wording';
import type { ArmState, ArmStatus } from '../../../model/types';
import { DepRow, type DepTone } from '../../shared/DepRow';

/** Keyed by ArmStatus, so a new status is a compile error here, not its enum spelled raw on the row (TrackPanel's chip table does the same). */
const ROW: Record<ArmStatus, { tone: DepTone; word: (a: ArmState) => string }> = {
  armed: { tone: 'met', word: () => 'armed' },
  ready: { tone: 'ready', word: () => 'ready' },
  open: { tone: 'you', word: (a) => `merge ${mergeLabel(a)}` },
  probing: { tone: 'none', word: () => 'probing' },
  locked: { tone: 'none', word: () => 'locked' },
  undefined: { tone: 'none', word: () => 'not defined yet' },
  unknown: { tone: 'none', word: () => 'unknown' },
};

/** A track as a dependency line: its id and name, its arm state on the right. */
export function TrackDep({ id }: { id: string }) {
  const { state: s, tracks, view } = useSetup();
  const a = s.arm[id];
  if (!a) return null;
  const r = ROW[a.st];
  return <DepRow tone={r.tone} glyph={a.st === 'armed' ? '✓' : '·'} label={`${id} ${tracks[id]?.name ?? ''}`} state={r.word(a)} onGo={() => view.go({ k: 'track', id })} />;
}
