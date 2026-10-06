'use client';

import { useHotkeys, type Hotkey } from '@/lib/keyboard/useHotkeys';
import { applyIntent, type TextSizeIntent } from './textSize';
import { applyTextSize, getTextSizeSnapshot } from './textSizeStore';

const change = (intent: TextSizeIntent) => () => applyTextSize(applyIntent(getTextSizeSnapshot(), intent));

const KEYS: readonly Hotkey[] = [
  { key: '=', mod: true, handler: change('bigger') },
  { key: '+', mod: true, handler: change('bigger') },
  { key: '-', mod: true, handler: change('smaller') },
  { key: '_', mod: true, handler: change('smaller') },
  { key: '0', mod: true, handler: change('reset') },
];

/** Mount once (from the root layout). Cmd/Ctrl + = / - / 0 change the text size everywhere. Renders nothing. */
export function TextSizeShortcuts() {
  useHotkeys(KEYS);
  return null;
}
