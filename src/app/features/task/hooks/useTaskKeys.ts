'use client';

import { useEffect, useRef } from 'react';
import { isTypingTarget } from '@/lib/keyboard/hotkeys';
import { actionFor, type TaskAction } from '../model/docket/keys';

/**
 * The Task screen's keys: ↑↓ ←→ [ ] f r w Esc. Plain keys only (⌘ chords belong to the shell). Typing fields, an open menu
 * and anything already handled (a popover taking Escape) are left alone. ↑↓ in the docket step tasks; elsewhere the arrows
 * walk the court, except in the toolbar and inspector, which keep their own.
 */
export function useTaskKeys(run: (a: TaskAction) => void, replaying: boolean) {
  const ref = useRef({ run, replaying });
  useEffect(() => {
    ref.current = { run, replaying };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('[role="menu"]')) return;
      const action = actionFor(e.key, {
        inDocket: !!el?.closest('[data-docket]'),
        inChrome: !!el?.closest('header, #inspector'),
        replaying: ref.current.replaying,
      });
      if (!action) return;
      e.preventDefault();
      ref.current.run(action);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
