'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ArmScreenKey } from '../navArm';
import { HANDOVER } from './model/registryRules';

/** A route's skeleton (ScreenSkeleton): the route has committed but its screen is still streaming in. */
const SKELETON = '[aria-busy="true"][data-layout]';

/** The route's top nodes React shows (Next keeps earlier routes mounted under a hidden <Activity>: display none). */
function shownNodes(root: HTMLElement): HTMLElement[] {
  return [...root.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.style.display !== 'none');
}

/** The route's top nodes shown since the activation: a new segment's nodes, or a kept earlier visit's revealed again. */
function fresh(root: HTMLElement, before: ReadonlySet<Element>): HTMLElement[] {
  return shownNodes(root).filter((el) => !before.has(el));
}

/**
 * Whether the real route of the active handover screen has landed: the router's pathname is that screen and the route's
 * (hidden) children show nodes that are its screen, not its skeleton. Judged per activation (`epoch`): the nodes shown
 * at activation are the previous route's. Watched with a MutationObserver, as a hidden subtree renders and streams
 * in at its own pace after the pathname commits.
 */
export function useLanded(ref: RefObject<HTMLElement | null>, pathname: string, active: ArmScreenKey | null, epoch: number): boolean {
  const [landedAt, setLandedAt] = useState(-1);
  const before = useRef<{ epoch: number; nodes: ReadonlySet<Element> }>({ epoch: -1, nodes: new Set() });
  const handover = active !== null && HANDOVER.has(active);
  const watching = handover && pathname === `/${active}`;

  useEffect(() => {
    // snapshot what the route shows when the copy is activated: those nodes never count as the landing
    if (handover && ref.current && before.current.epoch !== epoch) before.current = { epoch, nodes: new Set(shownNodes(ref.current)) };
  }, [ref, handover, epoch]);

  useEffect(() => {
    const root = ref.current;
    if (!watching || !root || landedAt === epoch) return;
    const check = () => {
      const nodes = fresh(root, before.current.nodes);
      if (!nodes.length || nodes.some((el) => el.matches(SKELETON) || el.querySelector(SKELETON))) return false;
      setLandedAt(epoch);
      return true;
    };
    if (check()) return;
    const obs = new MutationObserver(() => {
      if (check()) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy', 'style'] });
    return () => obs.disconnect();
  }, [ref, watching, epoch, landedAt]);

  return watching && landedAt === epoch;
}
