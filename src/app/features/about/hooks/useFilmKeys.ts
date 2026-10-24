'use client';

// The film's keys, on the whole page: any key skips the intro; Left and Right scrub, Home and End jump, Space plays or
// pauses (unless a button has focus: then Space presses it); Esc leaves for the app, as "Enter Afterlife" does. Keys
// with a modifier (the palette's ⌘K, the text-size shortcuts) and keys typed into a field are not the film's.
import { useEffect, useRef, type Dispatch } from 'react';
import type { FilmAction, FilmState } from '../model/playback';

const SCRUB: Record<string, FilmAction> = {
  ArrowRight: { type: 'next' },
  ArrowLeft: { type: 'prev' },
  Home: { type: 'first' },
  End: { type: 'last' },
};

function inField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('[role="dialog"]');
}

export function useFilmKeys(st: FilmState, dispatch: Dispatch<FilmAction>, leave: () => void): void {
  const now = useRef({ st, leave });
  useEffect(() => {
    now.current = { st, leave };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || inField(e.target)) return;
      const { st: s, leave: out } = now.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        out();
        return;
      }
      if (s.phase === 'intro') {
        if (e.key === 'Tab' || e.key === 'Shift') return; // moving focus is not a skip
        if (e.key !== 'Enter') e.preventDefault();
        dispatch({ type: 'skipIntro' });
        return;
      }
      const scrub = SCRUB[e.key];
      if (scrub) {
        e.preventDefault();
        dispatch(scrub);
        return;
      }
      const onButton = e.target instanceof Element && !!e.target.closest('button, a, [role="button"]');
      if (e.key === ' ' && !onButton) {
        e.preventDefault();
        dispatch({ type: 'toggle' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch]);
}
