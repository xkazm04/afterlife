'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StepKey } from '../model/types';

/** Longest the fold may take before the card goes anyway (no animationend when animations are off). */
const FOLD_MS = 600;

const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Which step's card is open and the fold back: Esc or ✕ folds it into its node, then that node takes focus again.
 * The roving focus on the orbit (`at`) follows the last node opened, so the arrow keys pick up where the person was.
 */
export function useCard(first: StepKey) {
  const [open, setOpen] = useState<StepKey | null>(null);
  const [closing, setClosing] = useState(false);
  const [at, setAt] = useState<StepKey | null>(null);
  const nodes = useRef(new Map<StepKey, HTMLButtonElement>());
  const back = useRef<StepKey | null>(null);

  const finish = useCallback(() => {
    setOpen((k) => {
      back.current = k;
      return null;
    });
    setClosing(false);
  }, []);
  const close = useCallback(() => (calm() ? finish() : setClosing(true)), [finish]);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(finish, FOLD_MS);
    return () => clearTimeout(t);
  }, [closing, finish]);

  // once the card is gone the orbit is no longer inert: the node it grew from takes focus back
  useEffect(() => {
    if (open !== null || !back.current) return;
    nodes.current.get(back.current)?.focus?.();
    back.current = null;
  }, [open]);

  return {
    open,
    closing,
    /** The node in the tab order: the last one moved to or opened, else the current step. */
    at: at ?? first,
    openIt: (k: StepKey) => {
      setAt(k);
      setClosing(false);
      setOpen(k);
    },
    close,
    finish,
    moveTo: (k: StepKey) => {
      setAt(k);
      nodes.current.get(k)?.focus?.();
    },
    refOf: (k: StepKey) => (el: HTMLButtonElement | null) => {
      if (el) nodes.current.set(k, el);
      else nodes.current.delete(k);
    },
  };
}
