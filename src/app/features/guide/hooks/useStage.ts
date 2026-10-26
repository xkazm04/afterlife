'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useHerePath, useHostNav } from '@/components/shell/host';
import { boxOf } from '@/app/features/xray/model/dom';
import { clip } from '@/app/features/xray/model/place';
import type { Box } from '@/app/features/xray/model/types';
import { REPLAY, TAB, find, pressable } from '../model/find';
import type { Step } from '../model/steps';

const TICK_MS = 300;
/** How long the ring holds its last place while the next step's element is not drawn yet (a screen coming in). */
const HOLD_MS = 1500;

/** Where the step's element is drawn in the window box, or null while its screen is still coming in (or was left). */
export interface Stage {
  area: Box;
  box: Box | null;
  /** The box is this step's own element, not the last one held while the screen comes in. */
  live: boolean;
}

const NONE: Stage = { area: { x: 0, y: 0, w: 0, h: 0 }, box: null, live: false };

/**
 * Sets the real app up for the step it is given. On entering a step (and only then, so a person who clicks away is not
 * pulled back) it navigates to the step's screen as a sidebar click does. Once that screen is drawn it does the step's
 * effects once each: open a Task tab, press Task's own Replay. Then it measures the element the step lights, on a short
 * tick, on resize and whenever a screen-host region lands, relative to the window box `layer` is drawn in. While the next
 * element is not drawn yet the last box is held for a moment, so the ring glides from screen to screen.
 */
export function useStage(layer: RefObject<HTMLElement | null>, step: Step | null, entry: string): Stage {
  const nav = useHostNav();
  const path = useHerePath();
  const [stage, setStage] = useState<Stage>(NONE);
  const navigated = useRef('');
  const held = useRef<Box | null>(null);
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!step || navigated.current === entry) return;
    navigated.current = entry;
    if (pathRef.current !== step.href) nav.navigate(step.href);
  }, [step, entry, nav]);

  useEffect(() => {
    if (!step) return;
    const done = new Set<number>();
    let scrolled = false;
    let last = '';
    let missing = 0;
    const act = () => {
      if (pathRef.current !== step.href) return;
      (step.effects ?? []).forEach((e, n) => {
        if (done.has(n) || done.size < n) return; // in order: a replay waits for its tab
        if (e.kind === 'tab') {
          const tab = find(TAB(e.tab));
          if (!tab) return;
          if (tab.getAttribute('aria-selected') !== 'true') tab.click();
          done.add(n);
        } else if (e.kind === 'replay') {
          const btn = find(REPLAY);
          if (!pressable(btn)) return;
          btn.click();
          done.add(n);
        } else done.add(n); // the tripwire is drawn by the layer
      });
    };
    const measure = () => {
      act();
      const host = layer.current?.parentElement;
      if (!host) return;
      const origin = host.getBoundingClientRect();
      const area = { x: 0, y: 0, w: origin.width, h: origin.height };
      const el = step.target && pathRef.current === step.href ? find(step.target) : null;
      if (el && !scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: 'nearest' });
      }
      const own = el ? clip(boxOf(el, origin), area) : null;
      let box = own;
      if (own) {
        held.current = own;
        missing = 0;
      } else if (step.target && held.current) {
        missing ||= Date.now();
        if (Date.now() - missing < HOLD_MS) box = held.current; // glide on from the last place, not a blink
      }
      const live = own !== null;
      const sig = JSON.stringify([area, box, live]);
      if (sig === last) return; // nothing moved: no re-render, so the ring does not restart
      last = sig;
      setStage({ area, box, live });
    };
    measure();
    const t = window.setInterval(measure, TICK_MS);
    window.addEventListener('resize', measure);
    let frame = 0;
    const landed = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    landed.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-reveal'] });
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', measure);
      landed.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [layer, step, entry]);

  return step ? stage : NONE;
}
