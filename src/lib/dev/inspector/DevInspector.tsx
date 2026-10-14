'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { buildChain, dedupeChain, pickDefaultIndex, type LocEntry } from './locate';
import { HighlightBox, InspectorHud, SourceLabel, Z } from './ui';

interface Hover {
  chain: LocEntry[];
  pointerRect: DOMRect;
  targetRect: DOMRect;
  index: number;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const inHud = (t: EventTarget | null) => t instanceof Element && t.closest('[data-devinspector]') !== null;

/**
 * Dev-only "point at a component, copy its source path". Ctrl/Cmd+Shift+L arms it; hover highlights, RIGHT-click copies
 * `src/.../File.tsx:LINE` (left-click still operates the app), Alt+right-click copies the literal element, Esc exits.
 * Needs the data-loc stamps from `npm run dev:inspect`; mounted from Providers only when NODE_ENV is development.
 */
export default function DevInspector() {
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [copied, setCopied] = useState<{ loc: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useHotkeys([
    { key: 'l', mod: true, shift: true, allowInInput: true, handler: () => setArmed((a) => !a) },
    { key: 'Escape', allowInInput: true, preventDefault: false, handler: () => setArmed(false) },
  ]);

  const doCopy = useCallback(async (loc: string) => {
    setCopied({ loc, ok: await copyText(loc) });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';
    const onMove = (e: MouseEvent) => {
      if (inHud(e.target)) return;
      const chain = buildChain(e.target as Element | null);
      const first = chain[0];
      if (!first) return setHover(null);
      const index = pickDefaultIndex(chain);
      setHover({ chain, index, pointerRect: first.el.getBoundingClientRect(), targetRect: (chain[index] ?? first).el.getBoundingClientRect() });
    };
    const onContextMenu = (e: MouseEvent) => {
      if (inHud(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const chain = buildChain(e.target as Element | null);
      const first = chain[0];
      if (first) void doCopy((e.altKey ? first : (chain[pickDefaultIndex(chain)] ?? first)).loc);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      document.body.style.cursor = prevCursor;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      setHover(null);
    };
  }, [armed, doCopy]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!armed) return null;
  const defaultLoc = hover?.chain[hover.index]?.loc ?? null;
  return createPortal(
    <div data-devinspector style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }}>
      {hover && hover.index !== 0 && <HighlightBox rect={hover.pointerRect} variant="pointer" />}
      {hover && <HighlightBox rect={hover.targetRect} variant="target" />}
      {hover && defaultLoc && <SourceLabel rect={hover.pointerRect} loc={defaultLoc} />}
      <InspectorHud
        copied={copied?.loc ?? null}
        copyOk={copied?.ok ?? true}
        mappingOn={document.querySelector('[data-loc]') !== null}
        crumbs={hover ? dedupeChain(hover.chain) : []}
        defaultLoc={defaultLoc}
        onCopy={doCopy}
      />
    </div>,
    document.body,
  );
}
