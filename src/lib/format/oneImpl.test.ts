// One implementation of the duration split: every exported helper in time.ts has a production caller, and no screen
// re-declares pad2 or re-splits seconds into h/m/s by hand.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
const prod = walk(path.join(root, 'src')).map((p) => ({ p: path.relative(root, p).split(path.sep).join('/'), code: strip(fs.readFileSync(p, 'utf8')) }));
const callers = ['src/app/features/setup/model/flow/probeAge.ts', 'src/app/features/needs-you/model/clock/clock.ts'];
const time = prod.find((f) => f.p === 'src/lib/format/time.ts')!;

describe('time.ts helpers are shared, not re-implemented in the setup probe age and the needs-you clock', () => {
  it('every exported helper has a production caller outside time.ts', () => {
    const names = [...time.code.matchAll(/export function (\w+)/g)].map((m) => m[1]);
    const dead = names.filter((n) => !prod.some((f) => f !== time && new RegExp(`\\b${n}\\b`).test(f.code)));
    expect(dead).toEqual([]);
  });
  it('neither caller declares its own pad2', () => {
    expect(prod.filter((f) => callers.includes(f.p) && /(const|function)\s+pad2\b/.test(f.code)).map((f) => f.p)).toEqual([]);
  });
  it('neither caller splits seconds into hours by hand', () => {
    expect(prod.filter((f) => callers.includes(f.p) && /\/\s*3600\b/.test(f.code) && /%\s*60\b/.test(f.code)).map((f) => f.p)).toEqual([]);
  });
});
