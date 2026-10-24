// The X-ray's one look at the DOM. A route kept alive in <Activity> is in the document but hidden (zero-sized), so only
// a match that is drawn counts: the label lands on the screen in front, never on a hidden copy of it.
import type { Box, ScreenRead } from './types';

const drawn = (el: Element): boolean => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The first drawn element matching `sel`, or null. An invalid selector matches nothing. */
export function pick(sel: string, root: ParentNode = document): HTMLElement | null {
  try {
    return ([...root.querySelectorAll(sel)].find(drawn) as HTMLElement | undefined) ?? null;
  } catch {
    return null;
  }
}

/** The element's box relative to `origin` (the window box the overlay is drawn in). */
export function boxOf(el: Element, origin: DOMRect): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

/** What the callouts read: the drawn screen's text and counts. */
export const screenRead: ScreenRead = {
  text: (sel) => (pick(sel)?.innerText ?? '').replace(/\s+/g, ' ').trim(),
  count: (sel) => {
    try {
      return [...document.querySelectorAll(sel)].filter(drawn).length;
    } catch {
      return 0;
    }
  },
};

/** The first number in a text, as written ("184 projects · 0 filters" -> "184"); fallback when there is none. */
export const numberIn = (text: string, fallback = '?'): string => /\d[\d,.]*/.exec(text)?.[0] ?? fallback;
