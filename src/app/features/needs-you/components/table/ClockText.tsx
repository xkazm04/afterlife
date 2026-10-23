'use client';

import { useLeftSec } from '../../hooks/ClockProvider';
import { clockText } from '../../model/clock/clock';

/** The time left on the clock as text, or "overdue" once it is gone; the leaf that re-renders each second so its row does not. */
export function ClockText() {
  const left = useLeftSec();
  return <>{left > 0 ? clockText(left) : 'overdue'}</>;
}
