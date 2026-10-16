// The "?" legend (data/constants.ts KEYS) and the key map (theaterHotkeys) are two hand-kept lists of one thing.
import { describe, expect, it, vi } from 'vitest';
import { dispatchHotkey } from '@/lib/keyboard/useHotkeys';
import { KEYS } from '../data/constants';
import { MAX_TAKES } from '../model/film/fromLedger';
import { theaterHotkeys } from './useTheaterKeys';
import type { Present } from './usePresent';
import type { TheaterActions } from './useTheaterActions';

/** What each legend row's key column stands for, as KeyboardEvent.key values. Cmd+I belongs to the Window, not to this map. */
const LEGEND: Readonly<Record<string, readonly string[]>> = {
  '1–8': ['1', '2', '3', '4', '5', '6', '7', '8'],
  R: ['r'],
  L: ['l'],
  'I / O': ['i', 'o'],
  Space: [' '],
  '← →': ['ArrowLeft', 'ArrowRight'],
  'Home / End': ['Home', 'End'],
  F: ['f'],
  '⌘I': [],
};

const calls: string[] = [];
const log = (name: string) => (...args: unknown[]) => void calls.push([name, ...args.filter((x) => typeof x !== 'object')].join(' '));
const actions: TheaterActions = {
  cue: log('cue'), roll: log('roll'), toggleLoop: log('loop'), markIn: log('in'), markOut: log('out'),
  togglePlay: log('play'), step: log('step'), seek: log('seek'),
};
const present: Present = { on: false, idle: false, set: log('present.set'), toggle: log('present.toggle') };
vi.stubGlobal('HTMLButtonElement', class {});
const keys = theaterHotkeys(actions, present, { takes: 8, entries: 41 });
const press = (key: string) => {
  calls.length = 0;
  const e = { key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, repeat: false, target: null, preventDefault: () => undefined };
  expect(dispatchHotkey(keys, e as unknown as KeyboardEvent)).toBe(true);
  return [...calls];
};

describe('the "?" legend against the key map', () => {
  it('every legend row is one this test knows how to read, so a new row must be mapped here', () => {
    for (const [k] of KEYS) expect(Object.keys(LEGEND)).toContain(k);
  });

  it('every key a legend row names is bound', () => {
    for (const [k] of KEYS) for (const key of LEGEND[k] ?? []) expect(() => press(key), `${k}: ${key}`).not.toThrow();
  });

  it('every bound key is named by the legend; Escape is the F row\'s "Esc returns"', () => {
    const named = new Set(KEYS.flatMap(([k]) => LEGEND[k] ?? []));
    for (const hk of keys) if (hk.key !== 'Escape') expect(named.has(hk.key), hk.key).toBe(true);
    expect(KEYS.find(([k]) => k === 'F')?.[1]).toMatch(/Esc/);
    expect(keys.some((hk) => hk.key === 'Escape')).toBe(true);
  });

  it('"1–8" is MAX_TAKES takes, and a film with fewer takes binds only its own digits', () => {
    expect(KEYS[0]?.[0]).toBe(`1–${MAX_TAKES}`);
    const three = theaterHotkeys(actions, present, { takes: 3, entries: 41 }).filter((hk) => /^\d$/.test(hk.key));
    expect(three.map((hk) => hk.key)).toEqual(['1', '2', '3']);
  });
});

describe('what the keys do', () => {
  it('digits cue the take before them (key 3 is take index 2); Home and End seek the first and last entry', () => {
    expect(press('3')).toEqual(['cue 2']);
    expect(press('Home')).toEqual(['seek 0']);
    expect(press('End')).toEqual(['seek 40']);
  });

  it('arrows step one entry, F toggles present, Escape leaves it', () => {
    expect(press('ArrowRight')).toEqual(['step 1']);
    expect(press('ArrowLeft')).toEqual(['step -1']);
    expect(press('f')).toEqual(['present.toggle']);
    expect(press('Escape')).toEqual(['present.set false']);
  });
});
