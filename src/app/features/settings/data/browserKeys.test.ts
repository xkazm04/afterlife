// The About page says what Afterlife keeps in this browser. Ground truth, not the list: every module that touches
// localStorage names the key constant it stores under, and each of those keys must be on the About page.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutSection } from '../components/AboutSection';

const SRC = resolve(__dirname, '../../../..');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
// lib/storage only moves pre-rename keys to the names the modules below own; it stores under no key of its own.
const code = walk(SRC)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(join('features', 'settings')) && !f.includes(join('lib', 'storage')))
  .map((f) => strip(readFileSync(f, 'utf8')));

/** Every exported `NAME_KEY = '...'` constant, by name. */
const constants = new Map(code.flatMap((s) => [...s.matchAll(/export const (\w+_KEY) = '([^']+)'/g)].map((m) => [m[1] ?? '', m[2] ?? ''])));
/** The key constants each localStorage-touching module names. */
const stored = code
  .filter((s) => /\blocalStorage\b/.test(s))
  .map((s) => [...constants.keys()].filter((n) => new RegExp(`\\b${n}\\b`).test(s)));

describe('the About page lists what Afterlife stores in this browser', () => {
  it('every module that touches localStorage names its key constant', () => {
    expect(stored.length).toBeGreaterThanOrEqual(3);
    expect(stored.filter((names) => names.length === 0)).toEqual([]);
  });
  it('shows every one of those keys', () => {
    const html = renderToString(createElement(AboutSection));
    const keys = [...new Set(stored.flat())].map((n) => constants.get(n) ?? '');
    expect(keys.length).toBeGreaterThanOrEqual(3);
    expect(keys.filter((k) => !html.includes(`<code>${k}</code>`))).toEqual([]);
  });
});
