import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { actionFor, TASK_KEYMAP } from '../../task/model/docket/keys';
import { MAX_TAKES } from '../../theater/model/film/fromLedger';
import { SCREEN_KEYS } from './screenKeys';

const rowsOf = (screen: string) => SCREEN_KEYS.find((s) => s.screen === screen)?.keys ?? [];
const capsOn = (screen: string) => rowsOf(screen).flatMap((r) => r.keys);

describe('SCREEN_KEYS, derived from the screens keymaps', () => {
  it('the Ladder filters one tier per key: 0 and 1-5 (five tiers)', () => {
    expect(rowsOf('Ladder').find((r) => r.keys.includes('0'))?.keys).toEqual(['0', '1-5']);
  });
  it('the Theater cues up to MAX_TAKES takes: 1-8', () => {
    expect(rowsOf('Theater').find((r) => r.does.startsWith('Cue'))?.keys).toEqual(['1-8']);
  });
  it('lists the Task screen and its keys', () => {
    expect(capsOn('Task')).toEqual(expect.arrayContaining(['[', ']', 'r', 'w', 'f', 'Esc']));
  });
});

// Ground truth, not the list: the tier list, the take cap and the key hooks on disk turn this red if a screen changes.
describe('SCREEN_KEYS against the ground truth', () => {
  it('names the Ladder tier filter by the real tier count', () => {
    expect(capsOn('Ladder')).toContain(`1-${TIER_DISPLAY_ORDER.length}`);
  });
  it('names the Theater take keys by the real take cap', () => {
    expect(capsOn('Theater')).toContain(`1-${MAX_TAKES}`);
  });
  it('has a row for every screen that registers a useXKeys hook', () => {
    const features = resolve(__dirname, '../..');
    const hooks = readdirSync(features, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => {
        try {
          return readdirSync(join(features, d.name, 'hooks')).filter((f) => /^use\w*Keys\.ts$/.test(f));
        } catch {
          return [];
        }
      });
    expect(hooks.length).toBe(6);
    expect(SCREEN_KEYS.length).toBe(hooks.length);
  });
});

describe('TASK_KEYMAP matches actionFor', () => {
  const ctx = { inDocket: false, inChrome: false, replaying: false };
  const documented = TASK_KEYMAP.entries.flatMap((e) => e.keys.map((k) => k.key));
  it('every documented key does something', () => {
    expect(documented.length).toBeGreaterThan(0);
    for (const key of documented) expect(actionFor(key, ctx), key).not.toBeNull();
  });
  it('every plain key actionFor answers is documented', () => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
    for (const key of [...letters, '[', ']', 'Escape']) if (actionFor(key, ctx)) expect(documented, key).toContain(key);
  });
});

// The Settings page is a server component: nothing screenKeys.ts reaches at runtime may be a 'use client' module.
const SRC = resolve(__dirname, '../../../..');
const fileOf = (from: string, spec: string): string | null => {
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((f) => existsSync(f) && f.match(/\.tsx?$/)) ?? null;
};
const runtimeImports = (src: string) =>
  [...src.matchAll(/^(?:import|export)\s+(?!type\s)[^'"]*?from\s+'([^']+)'|^import\s+'([^']+)'/gm)].map((m) => m[1] ?? m[2] ?? '');
function closure(entry: string): string[] {
  const seen = new Set<string>();
  const walk = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const spec of runtimeImports(readFileSync(f, 'utf8'))) {
      const next = fileOf(f, spec);
      if (next) walk(next);
    }
  };
  walk(entry);
  return [...seen];
}
const firstStatement = (src: string) =>
  src.replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, '').split(/[;\n]/)[0]?.trim();

describe('screenKeys.ts stays server-safe', () => {
  const files = closure(join(SRC, 'app/features/settings/data/screenKeys.ts'));
  it('reaches every screen keymap', () => {
    const rel = files.map((f) => relative(SRC, f).split(sep).join('/'));
    for (const m of [
      'app/features/fleet/model/keys/keymap.ts',
      'app/features/needs-you/model/keys/keymap.ts',
      'app/features/ladder/model/keymap.ts',
      'app/features/maturity/model/keys/keymap.ts',
      'app/features/task/model/docket/keys.ts',
      'app/features/theater/model/keymap.ts',
    ])
      expect(rel).toContain(m);
  });
  it("imports no 'use client' module", () => {
    for (const f of files) expect(firstStatement(readFileSync(f, 'utf8')), f).not.toMatch(/^['"]use client['"]$/);
  });
});
