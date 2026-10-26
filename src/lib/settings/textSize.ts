// D10: text size is a setting. Pure helpers, no DOM, so they are testable and usable from the boot script.

export const TEXT_SIZES = ['smaller', 'standard', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

/** Smaller by default (owner, 2026-10-26): the dense screens read best there; the guide shows where to go bigger. */
export const DEFAULT_TEXT_SIZE: TextSize = 'smaller';
export const TEXT_SIZE_STORAGE_KEY = 'afterlife.textSize';
export const TEXT_SIZE_ATTRIBUTE = 'data-text-size';

export const TEXT_SIZE_LABEL: Record<TextSize, string> = { smaller: 'Smaller', standard: 'Standard', larger: 'Larger' };

/** The scale table from D10, shown on the Settings screen. The CSS in styles/text-size.css is the source of truth. */
export interface TextSizeSpec {
  body: number;
  head: number;
  small: number;
  row: number;
  headerRow: number;
  toolbar: number;
  statusBar: number;
  sidebar: number;
  scale: number;
}
export const TEXT_SIZE_SPEC: Record<TextSize, TextSizeSpec> = {
  smaller: { body: 13, head: 12, small: 11, row: 22, headerRow: 24, toolbar: 52, statusBar: 22, sidebar: 200, scale: 1 },
  standard: { body: 15, head: 14, small: 13, row: 26, headerRow: 28, toolbar: 56, statusBar: 26, sidebar: 224, scale: 1.15 },
  larger: { body: 17, head: 16, small: 14, row: 30, headerRow: 32, toolbar: 60, statusBar: 28, sidebar: 248, scale: 1.3 },
};

export function isTextSize(value: unknown): value is TextSize {
  return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}

/** Anything unknown, missing or corrupt falls back to the default (Smaller). */
export function parseTextSize(value: unknown): TextSize {
  return isTextSize(value) ? value : DEFAULT_TEXT_SIZE;
}

/** One step bigger (+1) or smaller (-1), clamped at the ends. */
export function stepTextSize(current: TextSize, direction: 1 | -1): TextSize {
  const i = TEXT_SIZES.indexOf(current) + direction;
  return TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, i))] ?? DEFAULT_TEXT_SIZE;
}

export type TextSizeIntent = 'bigger' | 'smaller' | 'reset';

/** The keys that change the text size when held with Cmd or Ctrl: what TextSizeShortcuts mounts (TEXT_SIZE_HOTKEYS). */
export const TEXT_SIZE_KEYS: readonly (readonly [key: string, intent: TextSizeIntent])[] = [
  ['=', 'bigger'],
  ['+', 'bigger'],
  ['-', 'smaller'],
  ['_', 'smaller'],
  ['0', 'reset'],
];

export function applyIntent(current: TextSize, intent: TextSizeIntent): TextSize {
  if (intent === 'reset') return DEFAULT_TEXT_SIZE;
  return stepTextSize(current, intent === 'bigger' ? 1 : -1);
}

/** Best effort: a blocked or full store must never break the UI. Returns whether it was saved. */
export function writeStoredTextSize(storage: Pick<Storage, 'setItem'> | null | undefined, size: TextSize): boolean {
  try {
    storage?.setItem(TEXT_SIZE_STORAGE_KEY, size);
    return !!storage;
  } catch {
    return false;
  }
}

/** The inline script for <head>: sets the attribute before first paint so the page never flashes the wrong size. */
export function bootScriptSource(): string {
  const allowed = JSON.stringify(TEXT_SIZES);
  return `try{var v=localStorage.getItem(${JSON.stringify(TEXT_SIZE_STORAGE_KEY)});if(${allowed}.indexOf(v)>=0)document.documentElement.setAttribute(${JSON.stringify(TEXT_SIZE_ATTRIBUTE)},v)}catch(e){}`;
}
