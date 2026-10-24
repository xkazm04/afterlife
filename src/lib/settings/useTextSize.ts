'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { type TextSize } from './textSize';
import {
  applyTextSize,
  getTextSizeSavedServerSnapshot,
  getTextSizeSavedSnapshot,
  getTextSizeServerSnapshot,
  getTextSizeSnapshot,
  subscribeTextSize,
} from './textSizeStore';

/** The current text size and a setter (true when the browser saved it). Saved per viewer in localStorage (try/catch), Standard by default. */
export function useTextSize(): readonly [TextSize, (size: TextSize) => boolean] {
  const size = useSyncExternalStore(subscribeTextSize, getTextSizeSnapshot, getTextSizeServerSnapshot);
  const set = useCallback((next: TextSize) => applyTextSize(next), []);
  return [size, set] as const;
}

/** Whether this browser keeps the size on screen: false when localStorage refused the last write (whoever made it) or on load. */
export function useTextSizeSaved(): boolean {
  return useSyncExternalStore(subscribeTextSize, getTextSizeSavedSnapshot, getTextSizeSavedServerSnapshot);
}
