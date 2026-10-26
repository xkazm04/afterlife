// The guide's one look at the DOM: the real element a step lights, and the screen's own controls it presses. A route kept
// alive in <Activity> is in the document but hidden (zero-sized), so only a drawn match counts.
import type { Target } from './steps';

const drawn = (el: Element): boolean => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The first drawn match of `t`, narrowed by its text, or its parent when the target asks; null when none is drawn. */
export function find(t: Target, root: ParentNode = document): HTMLElement | null {
  let all: Element[];
  try {
    all = [...root.querySelectorAll(t.sel)];
  } catch {
    return null; // an invalid selector matches nothing
  }
  const hit = all.find((el) => drawn(el) && (!t.text || (el as HTMLElement).innerText.includes(t.text)));
  if (!hit) return null;
  return (t.parent ? hit.parentElement : hit) as HTMLElement | null;
}

/** A Task view tab, by its key. */
export const TAB = (tab: string): Target => ({ sel: `[role="tab"][data-tab="${tab}"]` });

/** Task's own Replay (r): it re-derives the verdict from the ledger, check by check, and never re-runs the agent. */
export const REPLAY: Target = { sel: 'button[title^="Replay from ledger"]' };

/** Whether `el` is a control that can be pressed now. */
export const pressable = (el: HTMLElement | null): el is HTMLElement => !!el && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
