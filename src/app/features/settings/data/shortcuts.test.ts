// SHORTCUTS is the Keyboard page's copy of what TextSizeShortcuts binds. This presses each listed key caps through the
// real matcher (textSizeIntent) and checks the label says what happens.
import { describe, expect, it } from 'vitest';
import { textSizeIntent, type TextSizeIntent } from '@/lib/settings/textSize';
import { SHORTCUTS } from './shortcuts';

const INTENT: Record<string, TextSizeIntent> = { 'Larger text': 'bigger', 'Smaller text': 'smaller', 'Standard size': 'reset' };

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
    expect(SHORTCUTS.map((s) => s.label)).toEqual(['Larger text', 'Smaller text', 'Standard size', 'Toggle the inspector']);
  });
});
