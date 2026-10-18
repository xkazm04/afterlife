// A screen's keys, declared once: what each key is (id, specs, a one-line description). The screen's hook binds handlers
// to it by id (bindKeymap), and the Settings reference reads the same declaration (capsOf). Pure and server-safe: no
// 'use client', so a server page can render it.
import type { HotkeySpec } from './hotkeys';
import type { Hotkey } from './useHotkeys';

/** One key as declared: the match plus how it fires (the same options a Hotkey takes). */
export type KeySpec = HotkeySpec & Pick<Hotkey, 'allowInInput' | 'preventDefault' | 'once'>;

export interface KeyEntry<Id extends string = string> {
  id: Id;
  keys: readonly KeySpec[];
  /** What the keys do, as the Settings reference shows it. */
  does: string;
}

export interface Keymap<Id extends string = string> {
  screen: string;
  entries: readonly KeyEntry<Id>[];
}

export type KeyHandler = (e: KeyboardEvent) => void;

/**
 * One handler for every key of the entry, or one per key in order: key i runs handler i, and only as many keys bind as
 * there are handlers (a film of three takes binds 1-3 of the declared 1-8).
 */
export type KeyBinding = KeyHandler | readonly KeyHandler[];

export function defineKeymap<const Id extends string>(screen: string, entries: readonly KeyEntry<Id>[]): Keymap<Id> {
  return { screen, entries };
}

/** The Hotkey list for `useHotkeys`, in declaration order. Throws on a declared id without a handler and on a handler without a declared id. */
export function bindKeymap<Id extends string>(map: Keymap<Id>, handlers: Readonly<Record<Id, KeyBinding>>): Hotkey[] {
  const declared = new Set<string>(map.entries.map((e) => e.id));
  for (const id of Object.keys(handlers)) if (!declared.has(id)) throw new Error(`${map.screen} keymap: no key declared for handler "${id}"`);
  return map.entries.flatMap((entry) => {
    const bound: KeyBinding | undefined = handlers[entry.id];
    if (!bound) throw new Error(`${map.screen} keymap: no handler for "${entry.id}"`);
    if (typeof bound === 'function') return entry.keys.map((spec) => ({ ...spec, handler: bound }));
    if (bound.length > entry.keys.length) throw new Error(`${map.screen} keymap: "${entry.id}" has more handlers than keys`);
    return entry.keys.slice(0, bound.length).map((spec, i) => ({ ...spec, handler: bound[i] as KeyHandler }));
  });
}

/**
 * bindKeymap as a screen's useXKeys hook calls it, feeding useHotkeys. A hook by name only (it calls no React hook, so
 * this module stays server-safe): the handlers close over refs, and the React Compiler lets a ref-holding closure flow
 * into a hook but flags it passed to a plain function, which might run it during render. bindKeymap never calls one.
 */
export function useKeymap<Id extends string>(map: Keymap<Id>, handlers: Readonly<Record<Id, KeyBinding>>): Hotkey[] {
  return bindKeymap(map, handlers);
}

const CAP_NAMES: Readonly<Record<string, string>> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ' ': 'Space',
  Escape: 'Esc',
};

const digit = (k: string | undefined) => (k && /^[1-9]$/.test(k) ? Number(k) : null);

/** The key caps a person reads: arrows as arrows, Space, Esc; a run of three or more of 1-9 as one cap ("1-5"). 0 stays its own. */
export function capsOf(specs: readonly HotkeySpec[]): string[] {
  const keys = specs.map((s) => s.key);
  const caps: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as string;
    let j = i;
    for (let d = digit(key); d !== null && digit(keys[j + 1]) === d + 1; d++) j++;
    if (j - i >= 2) {
      caps.push(`${key}-${keys[j]}`);
      i = j;
    } else caps.push(CAP_NAMES[key] ?? key);
  }
  return caps;
}
