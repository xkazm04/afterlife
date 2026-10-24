'use client';

import { useHotkeys, type Hotkey } from '@/lib/keyboard/useHotkeys';
import { applyIntent, TEXT_SIZE_KEYS, type TextSizeIntent } from './textSize';
import { applyTextSize, getTextSizeSnapshot } from './textSizeStore';

/** The store keeps whether the browser saved it (Display's note reads it), so the answer is not needed here. */
const change = (intent: TextSizeIntent) => () => applyTextSize(applyIntent(getTextSizeSnapshot(), intent));

/** What TextSizeShortcuts mounts: Cmd/Ctrl plus each of TEXT_SIZE_KEYS (Alt chords and bare keys do not match). */
export const TEXT_SIZE_HOTKEYS: readonly Hotkey[] = TEXT_SIZE_KEYS.map(([key, intent]) => ({ key, mod: true, handler: change(intent) }));

/** Mount once (from the root layout). Cmd/Ctrl + = / - / 0 change the text size everywhere. Renders nothing. */
export function TextSizeShortcuts() {
  useHotkeys(TEXT_SIZE_HOTKEYS);
  return null;
}
