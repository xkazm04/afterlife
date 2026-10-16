'use client';

import { useLeftSec } from '../../hooks/ClockProvider';
import { clockText } from '../../model/clock/clock';

/** The time left on the clock as text; the leaf that re-renders each second so its row does not. */
export function ClockText() {
  return <>{clockText(useLeftSec())}</>;
}
