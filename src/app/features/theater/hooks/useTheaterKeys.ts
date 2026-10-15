'use client';

import { useHotkeys, type Hotkey } from '@/lib/keyboard/useHotkeys';
import { MAX_TAKES } from '../model/film/fromLedger';
import type { Present } from './usePresent';
import type { TheaterActions } from './useTheaterActions';

/**
 * The Theater keys: 1-8 cue a take (as many as the film has), R roll, L loop, I / O marks, Space play/pause, Left/Right step, Home/End,
 * F present, Esc returns. Cmd/Ctrl+I (the inspector) belongs to the Window. They keep working while presenting.
 * Pure, so the "?" legend (data/constants.ts KEYS) can be checked against it.
 */
export function theaterHotkeys(a: TheaterActions, present: Present, film: { takes: number; entries: number }): Hotkey[] {
  const takes: Hotkey[] = Array.from({ length: Math.min(MAX_TAKES, film.takes) }, (_, k) => ({ key: String(k + 1), handler: () => a.cue(k) }));
  return [
    ...takes,
    { key: 'r', once: true, handler: a.roll },
    { key: 'l', once: true, handler: a.toggleLoop },
    { key: 'i', handler: a.markIn },
    { key: 'o', handler: a.markOut },
    {
      key: ' ',
      once: true,
      handler: (e) => {
        // A focused button would also "click" on Space: take focus off it first.
        if (!present.on && e.target instanceof HTMLButtonElement) e.target.blur();
        a.togglePlay();
      },
    },
    { key: 'ArrowRight', handler: () => a.step(1) },
    { key: 'ArrowLeft', handler: () => a.step(-1) },
    { key: 'Home', handler: () => a.seek(0) },
    { key: 'End', handler: () => a.seek(film.entries - 1) },
    { key: 'f', once: true, handler: present.toggle },
    { key: 'Escape', preventDefault: false, handler: () => present.set(false) },
  ];
}

export function useTheaterKeys(a: TheaterActions, present: Present, film: { takes: number; entries: number }): void {
  useHotkeys(theaterHotkeys(a, present, film));
}
