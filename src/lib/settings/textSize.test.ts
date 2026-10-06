import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_STORAGE_KEY,
  applyIntent,
  bootScriptSource,
  isTextSize,
  parseTextSize,
  readStoredTextSize,
  stepTextSize,
  textSizeIntent,
  writeStoredTextSize,
} from './textSize';

const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...mods,
});

describe('text size parsing', () => {
  it('defaults to Standard', () => {
    expect(DEFAULT_TEXT_SIZE).toBe('standard');
    expect(parseTextSize(null)).toBe('standard');
    expect(parseTextSize('huge')).toBe('standard');
    expect(parseTextSize(42)).toBe('standard');
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
  it('maps Cmd/Ctrl + = - 0', () => {
    expect(textSizeIntent(key('=', { metaKey: true }))).toBe('bigger');
    expect(textSizeIntent(key('+', { ctrlKey: true }))).toBe('bigger');
    expect(textSizeIntent(key('-', { ctrlKey: true }))).toBe('smaller');
    expect(textSizeIntent(key('0', { metaKey: true }))).toBe('reset');
  });
  it('ignores bare keys and Alt chords', () => {
    expect(textSizeIntent(key('='))).toBeNull();
    expect(textSizeIntent(key('0'))).toBeNull();
    expect(textSizeIntent(key('=', { ctrlKey: true, altKey: true }))).toBeNull();
    expect(textSizeIntent(key('a', { ctrlKey: true }))).toBeNull();
  });
  it('applies an intent', () => {
    expect(applyIntent('smaller', 'bigger')).toBe('standard');
    expect(applyIntent('larger', 'reset')).toBe('standard');
    expect(applyIntent('smaller', 'smaller')).toBe('smaller');
  });
});

describe('storage', () => {
  it('reads a saved value', () => {
    expect(readStoredTextSize({ getItem: (k) => (k === TEXT_SIZE_STORAGE_KEY ? 'larger' : null) })).toBe('larger');
  });
  it('survives a missing, corrupt or throwing store', () => {
    expect(readStoredTextSize(null)).toBe('standard');
    expect(readStoredTextSize({ getItem: () => 'nope' })).toBe('standard');
    expect(
      readStoredTextSize({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('standard');
  });
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
