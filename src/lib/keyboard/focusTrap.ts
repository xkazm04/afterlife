// Keeping Tab inside a modal: the rule as a pure function over the dialog's tabbable elements, so it is tested without a DOM.

/** What a keyboard user can Tab to. Disabled controls and tabindex="-1" are skipped; callers also drop hidden ones. */
export const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Where a Tab (or Shift+Tab, `back`) pressed inside a modal must send focus, or null to let the browser move it. It wraps
 * from the last element to the first and back, pulls focus that is on the dialog itself (or anywhere outside the list) to
 * the near end, and keeps it on `self` when the dialog has nothing to Tab to.
 */
export function trapTarget<T>(items: readonly T[], current: T | null, back: boolean, self: T): T | null {
  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) return self;
  const i = current === null ? -1 : items.indexOf(current);
  if (i < 0) return back ? last : first;
  if (back && i === 0) return last;
  if (!back && i === items.length - 1) return first;
  return null;
}
