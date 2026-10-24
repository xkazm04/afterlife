'use client';

import { useEffect, useState, type RefObject } from 'react';
import { boxOf, pick, screenRead } from '../model/dom';
import { clip, leader, placeCard } from '../model/place';
import type { Box, Callout } from '../model/types';

export interface Part {
  n: number;
  callout: Callout;
  /** Where it is drawn in the window, or null when it is not on screen (the inspector hidden, a screen still streaming). */
  box: Box | null;
}

export interface Layout {
  area: Box;
  parts: Part[];
  card: Box | null;
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  /** The active part's words, read off the screen now. */
  text: string;
}

const EMPTY: Layout = { area: { x: 0, y: 0, w: 0, h: 0 }, parts: [], card: null, line: null, text: '' };
const CARD_W = 330;
const LEGEND_W = 460;
const TICK_MS = 450;

/**
 * Measures the real elements the callouts name, relative to the window box `layer` is drawn in, and places the active
 * card. It re-measures on a short tick while on (screens stream in, tables scroll, the inspector opens) and on resize.
 */
export function useParts(layer: RefObject<HTMLElement | null>, callouts: readonly Callout[], active: number, on: boolean): Layout {
  const [layout, setLayout] = useState<Layout>(EMPTY);
  useEffect(() => {
    if (!on || callouts.length === 0) return;
    let last = '';
    const measure = () => {
      const host = layer.current?.parentElement;
      if (!host) return;
      const origin = host.getBoundingClientRect();
      const area = { x: 0, y: 0, w: origin.width, h: origin.height };
      const parts = callouts.map((c, i) => {
        const el = pick(c.sel);
        return { n: i + 1, callout: c, box: el ? clip(boxOf(el, origin), area) : null };
      });
      const target = parts[active]?.box ?? null;
      const panel = host.querySelector('[data-xray-panel]');
      const cardEl = host.querySelector('[data-xray-card]') as HTMLElement | null;
      const size = { w: Math.min(callouts[active]?.legend ? LEGEND_W : CARD_W, area.w - 40), h: cardEl?.offsetHeight || 150 };
      const card = target ? placeCard(target, size, area, panel ? boxOf(panel, origin) : null) : null;
      const c = callouts[active];
      const text = c ? c.body(screenRead) : '';
      const sig = JSON.stringify([area, parts.map((p) => p.box), card, text]);
      if (sig === last) return; // nothing moved: no re-render, so the drawn lines do not restart
      last = sig;
      setLayout({ area, parts, card, line: card && target ? leader(card, target) : null, text });
    };
    measure();
    const t = window.setInterval(measure, TICK_MS);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', measure);
    };
  }, [layer, callouts, active, on]);
  return shownLayout(layout, on, callouts.length);
}

/**
 * The layout to draw: the last measured one only while on and on a labelled screen. The effect stops measuring on a
 * screen with no callouts, so its kept state is the previous screen's parts and must not be drawn there.
 */
export const shownLayout = (layout: Layout, on: boolean, callouts: number): Layout => (on && callouts > 0 ? layout : EMPTY);
