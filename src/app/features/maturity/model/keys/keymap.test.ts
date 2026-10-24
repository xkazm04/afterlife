// A key the screen names in a title or a hint is read from the keymap (capsFor), never typed beside it: a rebound key
// would otherwise leave "(R)" or "← →" naming a key that no longer does it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { capsFor, MATURITY_KEYMAP } from './keymap';

const root = fileURLToPath(new URL('../..', import.meta.url));
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !p.endsWith(join('keys', 'keymap.ts')) ? [p] : [];
  });
/** Comments out: a doc line may name a key, a string may not. */
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

describe('capsFor', () => {
  it('reads an entry\'s caps from the keymap, letters upper-case', () => {
    expect(capsFor('rescan')).toEqual(['R']);
    expect(capsFor('mode')).toEqual(['D', 'N', 'T']);
    expect(capsFor('move')).toEqual(['←', '→', '↑', '↓']);
  });
});

describe('Maturity key hints', () => {
  it('no source types a key the keymap declares: "(R)", "(P)" and "← →" come from capsFor', () => {
    const letters = MATURITY_KEYMAP.entries.flatMap((e) => capsFor(e.id)).filter((c) => /^[A-Z]$/.test(c));
    const typed = new RegExp(`\\((?:${letters.join('|')})\\)|← →`, 'g');
    const hits = sources(root).flatMap((p) => (code(readFileSync(p, 'utf8')).match(typed) ?? []).map((m) => `${p.slice(root.length)}: ${m}`));
    expect(hits).toEqual([]);
  });
});
