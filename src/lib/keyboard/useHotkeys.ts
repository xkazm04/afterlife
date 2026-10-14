'use client';

import { useEffect, useRef } from 'react';
import { isTypingTarget, matchHotkey, type HotkeySpec } from './hotkeys';

export interface Hotkey extends HotkeySpec {
  handler: (e: KeyboardEvent) => void;
  /** Fire while the user is typing in an input (default false; chords with `mod` always fire). */
  allowInInput?: boolean;
  /** Default true: the browser's own action for the chord is cancelled. */
  preventDefault?: boolean;
  /** Ignore OS auto-repeat (a held key): for toggles such as play/pause. Default false, so held arrows keep repeating. */
  once?: boolean;
}

/** Run the first hotkey that matches `e`; returns whether one matched. A repeat of a `once` hotkey is swallowed (still default-prevented), never re-fired. */
export function dispatchHotkey(hotkeys: readonly Hotkey[], e: KeyboardEvent): boolean {
  for (const hk of hotkeys) {
    if (!matchHotkey(e, hk)) continue;
    if (!hk.mod && !hk.allowInInput && isTypingTarget(e.target)) continue;
    if (hk.preventDefault !== false) e.preventDefault();
    if (!(hk.once && e.repeat)) hk.handler(e);
    return true;
  }
  return false;
}

/**
 * Document-level keyboard shortcuts. Handlers are read through a ref, so passing a fresh array each render is fine.
 * Events already handled (defaultPrevented, e.g. by a Menu) are skipped. Pass `enabled=false` to switch off.
 */
export function useHotkeys(hotkeys: readonly Hotkey[], enabled = true): void {
  const ref = useRef(hotkeys);
  useEffect(() => {
    ref.current = hotkeys;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      dispatchHotkey(ref.current, e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
