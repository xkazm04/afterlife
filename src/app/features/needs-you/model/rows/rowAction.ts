// The one action button on each row, and what Space does on it.
import type { ActionId, NeedsState } from '../types';
import { isGapId } from './rowState';

export type ActionVariant = 'default' | 'accent' | 'ghost';
export interface RowAction {
  label: string;
  action: ActionId;
  variant: ActionVariant;
}
const a = (label: string, action: ActionId, variant: ActionVariant = 'default'): RowAction => ({ label, action, variant });

export function rowAction(s: NeedsState, id: string): RowAction | null {
  if (isGapId(id)) {
    const gs = s.gapStatus[id];
    if (gs === 'staged') return a('Take back', `unstage:${id}`, 'ghost');
    return gs === 'sent' ? null : a('Stage', `stage-gap:${id}`);
  }
  if (id === 'n2') {
    const st = s.status.n2;
    if (st === 'open') return s.read.draft ? a('Ready to sign', 'stage-n2', 'accent') : a('Read draft', 'read-draft');
    if (st === 'staged') return a('Take back', 'unstage:n2', 'ghost');
    return s.submitted ? null : a('I submitted it', 'submitted');
  }
  if (id === 'n1') {
    const st = s.status.n1;
    if (st === 'open') return a('Promote', 'stage-n1', 'accent');
    if (st === 'staged') return a('Take back', 'unstage:n1', 'ghost');
    if (st === 'sent') return a('Simulate merge', 'merge-n1', 'ghost');
    return st === 'snoozed' ? a('Show again', 'unsnooze-n1', 'ghost') : null;
  }
  if (id === 'n4') {
    const st = s.status.n4;
    if (st === 'open') return s.read.note ? a('Re-admit', 'stage-n4', 'accent') : a('Read note', 'read-note');
    return st === 'staged' ? a('Take back', 'unstage:n4', 'ghost') : null;
  }
  if (id === 'n5') {
    if (s.status.n5 === 'done') return null;
    return s.runner.opened ? a('Check again', 'check-runner') : a('Open runner page', 'open-runner');
  }
  return null;
}

/** What Space does on the selected row: tick an unstaged gap, otherwise run the row's one action. */
export function spaceAction(s: NeedsState, sel: string): ActionId | null {
  if (!sel || sel.startsWith('g:')) return null;
  if (isGapId(sel) && !s.gapStatus[sel]) return `tick:${sel}`;
  return rowAction(s, sel)?.action ?? null;
}
