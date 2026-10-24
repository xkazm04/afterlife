// SHORTCUTS is the Keyboard page's copy of what TextSizeShortcuts binds. This presses each listed key caps through the
// mounted hotkeys (TEXT_SIZE_HOTKEYS, via dispatchHotkey as useHotkeys does) and checks the size moves as the label says.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSPECTOR_HOTKEY } from '@/components/shell/bars/inspectorHotkey';
import { matchHotkey } from '@/lib/keyboard/hotkeys';
import { dispatchHotkey } from '@/lib/keyboard/useHotkeys';
import { TEXT_SIZE_ATTRIBUTE, type TextSize } from '@/lib/settings/textSize';
import { TEXT_SIZE_HOTKEYS } from '@/lib/settings/TextSizeShortcuts';
import { SHORTCUTS } from './shortcuts';

/** Each label's press from a size, and the size it must leave on screen. */
const MOVES: Record<string, readonly [from: TextSize, to: TextSize]> = { 'Larger text': ['standard', 'larger'], 'Smaller text': ['standard', 'smaller'], 'Standard size': ['larger', 'standard'] };
const INSPECTOR = 'Toggle the inspector, on a screen that has one';

let attrs: Record<string, string>;
beforeEach(() => {
  attrs = {};
  vi.stubGlobal('document', { documentElement: { getAttribute: (k: string) => attrs[k] ?? null, setAttribute: (k: string, v: string) => (attrs[k] = v) } });
  vi.stubGlobal('window', { localStorage: { setItem: () => undefined } });
});
afterEach(() => vi.unstubAllGlobals());

/** Press `key` with the given modifiers from `from`; the size on screen after, or null when no hotkey matched. */
const press = (from: TextSize, key: string, mods: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean }): string | null => {
  attrs[TEXT_SIZE_ATTRIBUTE] = from;
  const e = { key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods, repeat: false, target: null, preventDefault: () => {} };
  return dispatchHotkey(TEXT_SIZE_HOTKEYS, e as unknown as KeyboardEvent) ? (attrs[TEXT_SIZE_ATTRIBUTE] ?? null) : null;
};

describe('SHORTCUTS', () => {
  it.each(SHORTCUTS.filter((s) => s.label in MOVES))('$label: both key-cap lists do what the label says', (s) => {
    const mac = s.mac[1] ?? '';
    const other = s.other[1] ?? '';
    const [from, to] = MOVES[s.label] ?? ['standard', 'standard'];
    expect(mac).toBe(other);
    expect(press(from, mac, { metaKey: true })).toBe(to);
    expect(press(from, other, { ctrlKey: true })).toBe(to);
    expect(s.mac[0]).toBe('⌘');
    expect(s.other[0]).toBe('Ctrl');
  });
  it('the mounted text-size keys ignore bare keys and Alt chords', () => {
    expect(press('standard', '=', {})).toBeNull();
    expect(press('standard', '0', {})).toBeNull();
    expect(press('standard', '=', { ctrlKey: true, altKey: true })).toBeNull();
    expect(press('standard', 'a', { ctrlKey: true })).toBeNull();
  });
  it('lists all three text-size actions and the inspector toggle, nothing else', () => {
    expect(SHORTCUTS.map((s) => s.label)).toEqual(['Larger text', 'Smaller text', 'Standard size', INSPECTOR]);
  });
});

// Window binds Cmd/Ctrl+I only when a screen passes an inspector. The section is headed "Everywhere", so the row must
// say where it works while any screen (the Settings window itself among them) draws a Window without one.
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

describe('the inspector row', () => {
  const screens = walk(resolve(__dirname, '../..'))
    .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
    .map((f) => readFileSync(f, 'utf8'))
    .filter((s) => /<Window\b/.test(s));
  it('says it needs a screen with an inspector while some screen has none', () => {
    expect(screens.length).toBeGreaterThan(5);
    expect(screens.filter((s) => !/\binspector=/.test(s)).length).toBeGreaterThan(0);
    expect(SHORTCUTS.find((s) => s.mac[1] === 'I')?.label).toBe(INSPECTOR);
  });
});

// The row is a copy of the binding Window owns (components/shell/bars/inspectorHotkey): press the row's caps through the
// real matcher against that spec, so a rebind in the shell fails here instead of leaving the page wrong.
describe('the inspector row against the binding', () => {
  const row = SHORTCUTS.find((s) => s.label === INSPECTOR);
  it.each([
    ['mac', true, false],
    ['other', false, true],
  ] as const)('%s caps press the Window inspector hotkey', (side, metaKey, ctrlKey) => {
    const key = row?.[side][1] ?? '';
    expect(row?.[side][0]).toBe(metaKey ? '⌘' : 'Ctrl');
    expect(matchHotkey({ key: key.toLowerCase(), metaKey, ctrlKey, shiftKey: false, altKey: false }, INSPECTOR_HOTKEY)).toBe(true);
  });
});
