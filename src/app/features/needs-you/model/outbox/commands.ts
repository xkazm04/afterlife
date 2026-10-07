// The exact commands behind a row's write, for Copy Command. A policy MR's and a gap MR's are the server's preview.
import { CRA } from '../../data/cra';
import { RUNNER } from '../../data/runner';
import type { NeedsYouDemo } from '../../data/types';
import type { NeedsState } from '../types';
import { isGapId } from '../rows/rowState';
import { isPolicyKey } from './policy';

/**
 * The exact commands behind a row's write, for "Copy Command". Null when the row writes nothing to copy, or (a policy MR)
 * when the server's plan is not on screen yet.
 */
export function commandsFor(id: string, demo: NeedsYouDemo, writes: NeedsState['writes'] = {}): readonly string[] | null {
  if (id === 'n2') return CRA.commands;
  if (isPolicyKey(id) || isGapId(id)) {
    const v = writes[id];
    return v?.kind === 'preview' ? v.preview.commands.map((c) => c.display) : null;
  }
  return id === 'n5' ? [RUNNER.command] : null;
}
