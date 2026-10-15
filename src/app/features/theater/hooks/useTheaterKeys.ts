'use client';

import { useKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { MAX_TAKES } from '../model/film/fromLedger';
import { THEATER_KEYMAP } from '../model/keymap';
import type { Present } from './usePresent';
import type { TheaterActions } from './useTheaterActions';

/**
 * The Theater keys (model/keymap.ts): 1-8 cue a take (as many as the film has), R roll, L loop, I / O marks, Space play/pause, Left/Right step, Home/End,
 * F present, Esc returns. Cmd/Ctrl+I (the inspector) belongs to the Window. They keep working while presenting.
 */
export function useTheaterKeys(a: TheaterActions, present: Present, film: { takes: number; entries: number }): void {
  useHotkeys(
    useKeymap(THEATER_KEYMAP, {
      // As many cue keys as the film has takes.
      cue: Array.from({ length: Math.min(MAX_TAKES, film.takes) }, (_, k) => () => a.cue(k)),
      play: (e) => {
        // A focused button would also "click" on Space: take focus off it first.
        if (!present.on && e.target instanceof HTMLButtonElement) e.target.blur();
        a.togglePlay();
      },
      rollLoop: [a.roll, a.toggleLoop],
      marks: [a.markIn, a.markOut],
      seek: [() => a.step(-1), () => a.step(1), () => a.seek(0), () => a.seek(film.entries - 1)],
      present: [present.toggle, () => present.set(false)],
    }),
  );
}
