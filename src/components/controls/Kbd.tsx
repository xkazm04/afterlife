import type { ReactNode } from 'react';
import styles from './Kbd.module.css';

const MODIFIERS: Readonly<Record<string, string>> = { '⌘': 'Command', '⌥': 'Option', '⇧': 'Shift', '⌃': 'Control' };

/** What a screen reader should say for a keycap text with modifier glyphs ("⌘I" -> "Command I"); null when it has none. */
export function spokenKeys(text: string): string | null {
  if (![...text].some((c) => c in MODIFIERS)) return null;
  return [...text].map((c) => (c in MODIFIERS ? ` ${MODIFIERS[c]} ` : c)).join('').replace(/\s+/g, ' ').trim();
}

/**
 * A keycap, e.g. <Kbd>⌘I</Kbd>. A modifier glyph (⌘ ⌥ ⇧ ⌃) is drawn but hidden from assistive tech and its name
 * ("Command") is spoken instead, since a screen reader says a bare ⌘ as "place of interest" or nothing.
 */
export function Kbd({ children }: { children: ReactNode }) {
  const spoken = typeof children === 'string' ? spokenKeys(children) : null;
  if (!spoken) return <kbd className={styles.kbd}>{children}</kbd>;
  return (
    <kbd className={styles.kbd}>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{spoken}</span>
    </kbd>
  );
}
