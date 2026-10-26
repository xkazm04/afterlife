import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_KEYS,
  TEXT_SIZE_STORAGE_KEY,
  applyIntent,
  bootScriptSource,
  isTextSize,
  parseTextSize,
  stepTextSize,
  writeStoredTextSize,
} from './textSize';

describe('text size parsing', () => {
  it('defaults to Standard', () => {
    expect(DEFAULT_TEXT_SIZE).toBe('smaller');
    expect(parseTextSize(null)).toBe('smaller');
    expect(parseTextSize('huge')).toBe('smaller');
    expect(parseTextSize(42)).toBe('smaller');
  });
  it('accepts the three sizes', () => {
    for (const s of ['smaller', 'standard', 'larger']) {
      expect(isTextSize(s)).toBe(true);
      expect(parseTextSize(s)).toBe(s);
    }
  });
});

describe('stepTextSize', () => {
  it('moves one step and clamps at the ends', () => {
    expect(stepTextSize('standard', 1)).toBe('larger');
    expect(stepTextSize('standard', -1)).toBe('smaller');
    expect(stepTextSize('larger', 1)).toBe('larger');
    expect(stepTextSize('smaller', -1)).toBe('smaller');
  });
});

describe('keyboard intent', () => {
  it('has one key table, which the mounted shortcuts read (pressed in features/settings/data/shortcuts.test.ts)', () => {
    expect(TEXT_SIZE_KEYS).toEqual([['=', 'bigger'], ['+', 'bigger'], ['-', 'smaller'], ['_', 'smaller'], ['0', 'reset']]);
  });
  it('applies an intent', () => {
    expect(applyIntent('smaller', 'bigger')).toBe('standard');
    expect(applyIntent('larger', 'reset')).toBe('smaller');
    expect(applyIntent('smaller', 'smaller')).toBe('smaller');
  });
});

describe('storage', () => {
  it('writes best-effort', () => {
    const saved: Record<string, string> = {};
    expect(writeStoredTextSize({ setItem: (k, v) => void (saved[k] = v) }, 'smaller')).toBe(true);
    expect(saved[TEXT_SIZE_STORAGE_KEY]).toBe('smaller');
    expect(writeStoredTextSize(null, 'smaller')).toBe(false);
    expect(
      writeStoredTextSize(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        'smaller',
      ),
    ).toBe(false);
  });
});

describe('boot script', () => {
  it('sets the attribute for a saved size and ignores junk, inside a try/catch', () => {
    const src = bootScriptSource();
    expect(src).toContain('try{');
    expect(src).toContain('catch(e)');
    const run = (stored: string) => {
      const attrs: Record<string, string> = {};
      const fn = new Function('localStorage', 'document', src);
      fn({ getItem: () => stored }, { documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) } });
      return attrs;
    };
    expect(run('larger')).toEqual({ 'data-text-size': 'larger' });
    expect(run('bogus')).toEqual({});
  });
});
