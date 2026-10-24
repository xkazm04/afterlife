// The keys behind "?" (KEY_ROWS) and the keys the screen binds (useLadderKeys) are two hand-kept lists of one fact. This
// reads the bound keys from the hook itself, so a key added to one and not the other turns it red.
import { describe, expect, it, vi } from 'vitest';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import type { Hotkey } from '@/lib/keyboard/useHotkeys';
import { useLadderKeys } from '../hooks/useLadderKeys';
import { KEY_ROWS } from '../data/policy';
import { LADDER_KEYMAP } from './keymap';

const bindKeys = useLadderKeys;
const bound: { keys: Hotkey[] } = vi.hoisted(() => ({ keys: [] }));
vi.mock('@/lib/keyboard/useHotkeys', () => ({ useHotkeys: (keys: Hotkey[]) => void (bound.keys = keys) }));

const boundKeys = (): string[] => {
  bindKeys({ data: { state: { q: '' }, dispatch: () => undefined } as never, actions: {} as never, searchRef: { current: null }, enabled: true, toggleHelp: () => undefined });
  return bound.keys.map((k) => k.key).sort();
};

/** What the help lists: "Esc" is the Escape key, "↵" belongs to the focused table, a pair of digits is a range. */
const listedKeys = (): string[] =>
  KEY_ROWS.flatMap(([caps]) => {
    if (caps[0] === '1' && caps[1] === '5') return TIER_DISPLAY_ORDER.map((_, i) => String(i + 1));
    return caps.filter((c) => c !== '↵').map((c) => (c === 'Esc' ? 'Escape' : c));
  });

describe('the keys behind "?"', () => {
  it('list every key the screen binds, and no other ("?" opens the list, "0" is said in the tier-filter row)', () => {
    expect(boundKeys()).toEqual([...listedKeys(), '?', '0'].sort());
  });
  it('say what 0 does in the row that says what 1-5 do', () => {
    const row = KEY_ROWS.find(([caps]) => caps[0] === '1');
    expect(row?.[1]).toMatch(/\b0\b/);
  });
  it('count the tier filters as the screen has tiers', () => {
    expect(boundKeys().filter((k) => /^[1-9]$/.test(k))).toHaveLength(TIER_DISPLAY_ORDER.length);
  });
});

describe('the keymap Settings > Keyboard lists', () => {
  // Escape clears the search and gives the table focus back (useLadderKeys): the inspector it once closed is the class page
  it('says what each key does on the screen as it is, never the removed inspector', () => {
    expect(JSON.stringify(LADDER_KEYMAP)).not.toMatch(/inspector/i);
  });
});
