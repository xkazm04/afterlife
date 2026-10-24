// The accessible name a sticky popover takes from the control that opened it. A sticky popover is a role=dialog, and
// a dialog with no name is announced as just "dialog"; its trigger already says what it is ("Legend", "Keys and legend").

/** The anchor's aria-label, else its visible text (whitespace collapsed); undefined when it has neither. */
export function anchorName(anchor: { getAttribute(name: string): string | null; textContent: string | null }): string | undefined {
  const named = anchor.getAttribute('aria-label')?.trim();
  if (named) return named;
  const text = anchor.textContent?.replace(/\s+/g, ' ').trim();
  return text || undefined;
}
