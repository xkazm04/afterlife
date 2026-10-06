'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_MS = 2200;

export interface Present {
  on: boolean;
  /** The pointer has been still: hide the cursor. */
  idle: boolean;
  set: (on: boolean) => void;
  toggle: () => void;
}

/**
 * Present mode: F toggles, Esc returns. It also asks the browser for full screen (optional: a refusal is fine)
 * and follows the browser leaving full screen (Esc handled by the browser) back to the windowed screen.
 */
export function usePresent(): Present {
  const [on, setOn] = useState(false);
  const [idle, setIdle] = useState(false);
  const onRef = useRef(false);

  useEffect(() => {
    onRef.current = on;
  }, [on]);

  const set = useCallback((next: boolean) => {
    if (next === onRef.current) return;
    onRef.current = next;
    setOn(next);
    setIdle(false);
    try {
      if (next && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      if (!next && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } catch {
      /* full screen is optional */
    }
  }, []);

  useEffect(() => {
    const onFullscreen = () => {
      if (!document.fullscreenElement && onRef.current) set(false);
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, [set]);

  useEffect(() => {
    if (!on) return;
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    document.addEventListener('mousemove', wake);
    return () => {
      document.removeEventListener('mousemove', wake);
      window.clearTimeout(timer);
    };
  }, [on]);

  const toggle = useCallback(() => set(!onRef.current), [set]);
  return { on, idle, set, toggle };
}
