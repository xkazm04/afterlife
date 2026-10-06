import type { NeedsYouDemo } from '../../data/types';
import type { Action, NeedsState } from '../../model/types';

/** What every inspector view reads: the screen state, the demo slice, the live clock and the dispatcher. */
export interface InspProps {
  s: NeedsState;
  demo: NeedsYouDemo;
  leftSec: number;
  dispatch: (a: Action) => void;
}
