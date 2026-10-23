// SHORTCUTS is the Keyboard page's copy of what TextSizeShortcuts binds. This presses each listed key caps through the
// real matcher (textSizeIntent) and checks the label says what happens.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { textSizeIntent, type TextSizeIntent } from '@/lib/settings/textSize';
import { SHORTCUTS } from './shortcuts';

const INTENT: Record<string, TextSizeIntent> = { 'Larger text': 'bigger', 'Smaller text': 'smaller', 'Standard size': 'reset' };
const INSPECTOR = 'Toggle the inspector, on a screen that has one';

describe('SHORTCUTS', () => {
  it.each(SHORTCUTS.filter((s) => s.label in INTENT))('$label: both key-cap lists do what the label says', (s) => {
    const mac = s.mac[1] ?? '';
    const other = s.other[1] ?? '';
    expect(mac).toBe(other);
    expect(textSizeIntent({ key: mac, metaKey: true, ctrlKey: false, altKey: false })).toBe(INTENT[s.label]);
    expect(textSizeIntent({ key: other, metaKey: false, ctrlKey: true, altKey: false })).toBe(INTENT[s.label]);
    expect(s.mac[0]).toBe('⌘');
    expect(s.other[0]).toBe('Ctrl');
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
