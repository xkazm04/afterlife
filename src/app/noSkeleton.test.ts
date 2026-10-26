import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The operator's rule since the screen host: no skeleton anywhere. A screen paints its real frame at once (dashes for
// what is not read, docs/features/screen-host.md), so nothing in src may bring back a route loading file, a Skeleton or
// Loading component, or a Suspense fallback that draws a stand-in shape. A fallback is null, or a real still frame of
// the thing itself, named here.
const SRC = path.join(import.meta.dirname, '..');
const STILL_FRAMES = new Set(['DoorFrame', 'AboutFrame', 'NavList', 'SettingsLink']);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : files(p);
    return [p];
  });
}

const all = files(SRC);
const rel = (f: string) => path.relative(SRC, f).replaceAll('\\', '/');
const source = all.filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\.(tsx?|jsx?)$/.test(f));

describe('no skeleton anywhere', () => {
  it('no route segment has a loading file', () => {
    expect(all.filter((f) => /^loading\.(tsx?|jsx?)$/.test(path.basename(f))).map(rel)).toEqual([]);
  });

  it('no component file or exported component is a Skeleton or a Loading stand-in', () => {
    expect(source.filter((f) => /skeleton|loading/i.test(path.basename(f))).map(rel)).toEqual([]);
    const named = source.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/export (?:default )?(?:async )?(?:function|const) (\w*(?:Skeleton|Loading)\w*)/g)].map((m) => `${rel(f)}: ${m[1]}`),
    );
    expect(named).toEqual([]);
  });

  it('every Suspense fallback is null or a real still frame', () => {
    const bad = source.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/fallback=(\{\s*(?:<(\w+)[^}]*|[^}]*)\}|"[^"]*")/g)]
        .filter((m) => {
          const value = m[1] ?? '';
          if (/^\{\s*(null|undefined)\s*\}$/.test(value)) return false;
          return !(m[2] && STILL_FRAMES.has(m[2]));
        })
        .map((m) => `${rel(f)}: ${m[0].slice(0, 60)}`),
    );
    expect(bad).toEqual([]);
  });

  it('the guard sees the frames it allows (it is not vacuous)', () => {
    const text = source.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(text).toContain('fallback={<DoorFrame />}');
    expect(text).toContain('fallback={null}');
  });
});
