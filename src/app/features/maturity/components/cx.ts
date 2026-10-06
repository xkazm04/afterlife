import type { KeyboardEvent } from 'react';

/** Join class names, skipping the falsy ones. */
export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

/** Enter or Space runs `fn`: for the SVG parts that act as buttons. */
export const onActivate = (fn: () => void) => (e: KeyboardEvent<Element>) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  fn();
};
