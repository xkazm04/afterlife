// Keyboard shortcuts listed on the Settings screen. Plain data.

export interface ShortcutRow {
  label: string;
  /** Key caps for macOS, then for Windows / Linux. */
  mac: readonly string[];
  other: readonly string[];
}

export const SHORTCUTS: readonly ShortcutRow[] = [
  { label: 'Larger text', mac: ['⌘', '='], other: ['Ctrl', '='] },
  { label: 'Smaller text', mac: ['⌘', '-'], other: ['Ctrl', '-'] },
  { label: 'Default size (Smaller)', mac: ['⌘', '0'], other: ['Ctrl', '0'] },
  { label: 'Toggle the inspector, on a screen that has one', mac: ['⌘', 'I'], other: ['Ctrl', 'I'] },
];
