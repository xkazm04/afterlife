import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capsOf, type Keymap } from '@/lib/keyboard/keymap';
import { SCREEN_KEYS } from './screenKeys';

// The per-screen key list is read against every keymap declared on disk, not against a hand list of screens or a
// hooks/useXKeys naming convention: a keymap bound anywhere (a hook, or a screen like the live Theater film) must have
// each of its keys on the Keyboard page.
const FEATURES = resolve(__dirname, '../..');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const declaring = walk(FEATURES).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && /\bdefineKeymap\(/.test(strip(readFileSync(f, 'utf8'))));
const isKeymap = (v: unknown): v is Keymap => typeof v === 'object' && v !== null && 'screen' in v && 'entries' in v;

describe('SCREEN_KEYS against every keymap declared on disk', () => {
  it('finds the keymap modules (the walk is not empty)', () => {
    expect(declaring.length).toBeGreaterThan(5);
  });
  it('lists every key of every declared keymap, with its caps', async () => {
    const maps = (await Promise.all(declaring.map((f) => import(f)))).flatMap((m: Record<string, unknown>) => Object.values(m).filter(isKeymap));
    const rows = new Set(SCREEN_KEYS.flatMap((s) => s.keys.map((k) => `${k.does} = ${k.keys.join(' ')}`)));
    const missing = maps.flatMap((m) => m.entries.map((e) => `${m.screen}: ${e.does} = ${capsOf(e.keys).join(' ')}`).filter((r) => !rows.has(r.slice(r.indexOf(': ') + 2))));
    expect(maps.length).toBeGreaterThan(SCREEN_KEYS.length);
    expect(missing).toEqual([]);
  });
});
