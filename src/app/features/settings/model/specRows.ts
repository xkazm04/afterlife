// Rows of the "what changes" table on the Settings screen, derived from the D10 scale table.
import { TEXT_SIZES, TEXT_SIZE_SPEC, type TextSize, type TextSizeSpec } from '@/lib/settings/textSize';

export interface SpecRow {
  label: string;
  /** One cell per size, in TEXT_SIZES order. */
  values: Record<TextSize, string>;
}

const ROWS: readonly { label: string; format: (s: TextSizeSpec) => string }[] = [
  { label: 'Body / header / small', format: (s) => `${s.body} / ${s.head} / ${s.small} px` },
  { label: 'Row / header row', format: (s) => `${s.row} / ${s.headerRow} px` },
  { label: 'Toolbar / status bar', format: (s) => `${s.toolbar} / ${s.statusBar} px` },
  { label: 'Sidebar', format: (s) => `${s.sidebar} px` },
  { label: 'Drawn parts', format: (s) => `${s.scale}x` },
];

export function specRows(): SpecRow[] {
  return ROWS.map((r) => ({
    label: r.label,
    values: Object.fromEntries(TEXT_SIZES.map((t) => [t, r.format(TEXT_SIZE_SPEC[t])])) as Record<TextSize, string>,
  }));
}
