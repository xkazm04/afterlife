import { KEY_ROWS } from '../../data/policy';

/**
 * The rows of "?" for a screen that binds only some of the Ladder's keys: a row stays when every key in it is one the
 * screen binds. Esc stays on every screen (the popover closes on it). The class page binds r, q and p; j k, Enter, /
 * and the tier keys belong to the list, so the page's "?" must not offer them.
 */
export function keyRowsFor(bound: readonly string[]): typeof KEY_ROWS {
  return KEY_ROWS.filter(([caps]) => caps.every((k) => k === 'Esc' || bound.includes(k)));
}
