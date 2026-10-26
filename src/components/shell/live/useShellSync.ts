'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShellInfo } from '../ShellContext';
import { onHostNav } from './hostNav';
import { initSync, readAnswer, SHELL_READ_EVENT, shouldSync, syncReducer, type SyncAction, type SyncTrigger } from './sync';

/**
 * The shell's numbers kept live: `value` is the root layout's read (its first paint, and again whenever refresh()
 * re-renders the layout); the client re-reads /api/shell on regained focus, when the screen host shows or re-reads a
 * screen (hostNav.ts, debounced), and when a screen asks (requestShellRead) (sync.ts). A router route change reads nothing.
 */
export function useShellSync(value: ShellInfo): ShellInfo {
  const [state, setState] = useState(() => initSync(value));
  const current = useRef(state);
  const step = useCallback((a: SyncAction) => {
    current.current = syncReducer(current.current, a);
    setState(current.current);
  }, []);

  const abort = useRef<AbortController | null>(null);
  const pull = useCallback((t: SyncTrigger) => {
    if (!shouldSync(current.current, t)) return;
    step({ type: 'issue' });
    const id = current.current.next;
    abort.current = new AbortController();
    void readAnswer(abort.current.signal).then((info) => step({ type: 'answer', id, info }));
  }, [step]);
  useEffect(() => () => abort.current?.abort(), []);

  // A new server prop wins at once (rendered below before this effect runs) and voids every request before it.
  useEffect(() => {
    if (current.current.prop !== value) step({ type: 'server', info: value });
  }, [value, step]);

  useEffect(() => {
    const onFocus = () => pull({ kind: 'focus' });
    const onAsk = () => pull({ kind: 'ask' });
    window.addEventListener('focus', onFocus);
    window.addEventListener(SHELL_READ_EVENT, onAsk);
    const offNav = onHostNav(() => pull({ kind: 'nav' }));
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(SHELL_READ_EVENT, onAsk);
      offNav();
    };
  }, [pull]);

  return state.prop === value ? state.info : value;
}
