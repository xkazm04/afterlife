// What a key in the palette's field does, given the highlighted row and how many rows there are. Pure.
// Escape is not here: it closes through the overlay layers (escapeLayers), so the palette is the one layer it closes.

export type PaletteKeyAction = { at: number } | { go: true } | { stay: true };

/**
 * ↓ / ↑ move the highlight (stopping at the ends, never below row 0), Enter goes to the highlighted row, and Tab stays
 * in the field: the dialog is modal and the field is its one stop, so Tab must not walk the page behind the veil.
 * Any other key is the field's own (null).
 */
export function paletteKey(key: string, at: number, count: number): PaletteKeyAction | null {
  if (key === 'ArrowDown') return { at: Math.max(0, Math.min(count - 1, at + 1)) };
  if (key === 'ArrowUp') return { at: Math.max(0, at - 1) };
  if (key === 'Enter') return { go: true };
  if (key === 'Tab') return { stay: true };
  return null;
}
