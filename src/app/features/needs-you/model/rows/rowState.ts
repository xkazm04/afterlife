// What a row says in its State column, and the three questions the filters ask of it.
import { DECISION_IDS } from '../../data/constants';
import type { NeedsState } from '../types';

export type GlyphKind = 'wait' | 'stg' | 'ok' | 'unk' | 'dash' | 'open';
/** '' waiting (amber), 'stg' staged, 'ok' done, 'dim' set aside, 'unk' unknown (drawn dashed). */
export type RowTone = '' | 'stg' | 'ok' | 'dim' | 'unk';
export interface RowState {
  tone: RowTone;
  glyph: GlyphKind;
  label: string;
}

const wait = (label: string): RowState => ({ tone: '', glyph: 'wait', label });
const staged: RowState = { tone: 'stg', glyph: 'stg', label: 'in outbox' };
const ok = (label: string): RowState => ({ tone: 'ok', glyph: 'ok', label });

export const isGapId = (id: string): boolean => /^g\d+$/.test(id);
/** A decision row (not a group "g:..." and not a history row "h..."). */
export const isDecisionId = (id: string): boolean => /^(n\d+|g\d+)$/.test(id);

function gapState(s: NeedsState, id: string): RowState {
  const gs = s.gapStatus[id];
  if (gs === 'staged') return staged;
  if (gs === 'sent') return ok('sent');
  return s.gaps[id] ? wait('picked') : { tone: 'dim', glyph: 'open', label: 'you pick' };
}

export function rowState(s: NeedsState, id: string): RowState {
  if (isGapId(id)) return gapState(s, id);
  if (id !== 'n1' && id !== 'n2' && id !== 'n4' && id !== 'n5') return { tone: '', glyph: 'wait', label: '' };
  const st = s.status[id];
  if (st === 'staged') return staged;
  if (id === 'n2') return st === 'sent' ? ok(s.submitted ? 'submitted' : 'ready to sign') : wait(s.read.draft ? 'draft read' : 'waiting');
  if (id === 'n1') {
    if (st === 'sent') return ok('MR open');
    if (st === 'merged') return ok('merged');
    return st === 'snoozed' ? { tone: 'dim', glyph: 'dash', label: 'not yet' } : wait('waiting');
  }
  if (id === 'n4') {
    if (st === 'sent') return ok('MR open');
    if (st === 'retired') return ok('retired');
    return wait(s.read.note ? 'note read' : 'waiting');
  }
  if (st === 'done') return ok('verified');
  return s.runner.check === 'none' ? { tone: 'unk', glyph: 'unk', label: 'not seen' } : wait('waiting');
}

export const isWaiting = (s: NeedsState, id: string): boolean => rowState(s, id).tone === '';
export const isInOutbox = (s: NeedsState, id: string): boolean => rowState(s, id).tone === 'stg';
/** Decided: sent, merged, retired, verified or set aside. A gap nobody has acted on is not decided. */
export function isDecided(s: NeedsState, id: string): boolean {
  const tone = rowState(s, id).tone;
  return (tone === 'ok' || tone === 'dim') && !(isGapId(id) && !s.gapStatus[id]);
}

export interface Counts {
  all: number;
  waiting: number;
  outbox: number;
  decided: number;
}
export function decisionCounts(s: NeedsState): Counts {
  const ids = DECISION_IDS;
  return {
    all: ids.length,
    waiting: ids.filter((id) => isWaiting(s, id)).length,
    outbox: ids.filter((id) => isInOutbox(s, id)).length,
    decided: ids.filter((id) => isDecided(s, id)).length,
  };
}
