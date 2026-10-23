import type { HotkeySpec } from '@/lib/keyboard/hotkeys';

/**
 * Cmd/Ctrl+I: the Window binds it to the inspector toggle when a screen passes an inspector. Plain data (no 'use client'),
 * so the Settings Keyboard page's row can be checked against the binding itself (settings/data/shortcuts.test.ts).
 */
export const INSPECTOR_HOTKEY: HotkeySpec = { key: 'i', mod: true };
