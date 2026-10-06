'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { type TextSize } from './textSize';
import { applyTextSize, getTextSizeServerSnapshot, getTextSizeSnapshot, subscribeTextSize } from './textSizeStore';

/** The current text size and a setter. Saved per viewer in localStorage (try/catch), Standard by default. */
export function useTextSize(): readonly [TextSize, (size: TextSize) => void] {
  const size = useSyncExternalStore(subscribeTextSize, getTextSizeSnapshot, getTextSizeServerSnapshot);
  const set = useCallback((next: TextSize) => applyTextSize(next), []);
  return [size, set] as const;
}
