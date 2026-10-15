'use client';

import { useHotkeys, type Hotkey } from '@/lib/keyboard/useHotkeys';
import { applyIntent, TEXT_SIZE_KEYS, type TextSizeIntent } from './textSize';
import { applyTextSize, getTextSizeSnapshot } from './textSizeStore';

const change = (intent: TextSizeIntent) => () => applyTextSize(applyIntent(getTextSizeSnapshot(), intent));

const KEYS: readonly Hotkey[] = TEXT_SIZE_KEYS.map(([key, intent]) => ({ key, mod: true, handler: change(intent) }));

/** Mount once (from the root layout). Cmd/Ctrl + = / - / 0 change the text size everywhere. Renders nothing. */
export function TextSizeShortcuts() {
  useHotkeys(KEYS);
  return null;
}
