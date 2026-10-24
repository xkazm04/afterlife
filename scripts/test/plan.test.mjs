import { describe, expect, it } from 'vitest';
import { BROAD_PERCENT, planFor, relatedSources } from './plan.mjs';

const nav = 'src/components/shell/sidebar/navItems.test.ts';
const allTests = ['src/lib/a.test.ts', 'src/lib/b.test.ts', 'src/app/x/page.test.tsx', nav, 'scripts/tooling-config.test.mjs'];
const guards = [nav, 'scripts/tooling-config.test.mjs'];
const plan = (changed, related = []) => planFor({ changed, allTests, guards, related });

describe('planFor', () => {
  it('a source change runs its related tests and the guards', () => {
    const p = plan(['src/lib/a.ts'], ['src/lib/a.test.ts', 'src/lib/gone.test.ts']);
    expect(p.files).toEqual(['scripts/tooling-config.test.mjs', 'src/components/shell/sidebar/navItems.test.ts', 'src/lib/a.test.ts']);
    expect(p.guards).toEqual(guards.slice().sort());
    expect(p.infra).toBe(false);
    expect(p.reason).toContain('1 changed source file');
  });

  it('a changed test file runs itself', () => {
    const p = plan(['src/lib/b.test.ts']);
    expect(p.files).toContain('src/lib/b.test.ts');
    expect(p.reason).toContain('1 changed test file');
  });

  it('markdown-only and css-only changes run the guards alone', () => {
    for (const changed of [['docs/features/quality.md', 'README.md'], ['src/styles/tokens.css', 'src/app/x/x.module.css'], ['public/logo.png', 'src/data/x.json']]) {
      const p = plan(changed);
      expect(p.files).toEqual(p.guards);
      expect(p.infra).toBe(false);
      expect(relatedSources(changed)).toEqual([]);
    }
  });

  it('an infra change is flagged and still never lists the whole suite', () => {
    for (const f of ['package.json', 'package-lock.json', 'vitest.config.ts', 'tsconfig.json', 'next.config.ts', 'eslint.config.mjs']) {
      const p = plan([f]);
      expect(p.infra, f).toBe(true);
      expect(p.files).toEqual(p.guards);
    }
    expect(plan(['src/tsconfig.build.json']).infra).toBe(true);
    expect(plan(['src/lib/package.json.ts']).infra).toBe(false);
  });

  it('nothing changed gives the guards and an honest reason', () => {
    const p = plan([]);
    expect(p).toEqual({ files: p.guards, guards: p.guards, infra: false, reason: 'nothing changed', skipped: [] });
  });

  it('empty input is empty arrays, never null', () => {
    expect(planFor({ changed: [], allTests: [], guards: [] })).toEqual({ files: [], guards: [], infra: false, reason: 'nothing changed', skipped: [] });
  });

  it('a rename keeps the new test and drops the old one that no longer exists', () => {
    const p = plan(['src/lib/old.test.ts', 'src/lib/b.test.ts', 'src/lib/old.ts', 'src/lib/new.ts']);
    expect(p.files).toContain('src/lib/b.test.ts');
    expect(p.files).not.toContain('src/lib/old.test.ts');
    expect(relatedSources(['src/lib/old.ts', 'src/lib/new.ts'])).toEqual(['src/lib/new.ts', 'src/lib/old.ts']);
  });

  it('a deleted source file is still looked up, and a deleted test file is simply gone', () => {
    expect(relatedSources(['src/lib/deleted.ts'])).toEqual(['src/lib/deleted.ts']);
    const p = plan(['src/lib/deleted.test.ts', 'src/lib/deleted.ts'], ['src/lib/a.test.ts']);
    expect(p.files).toContain('src/lib/a.test.ts');
    expect(p.files).not.toContain('src/lib/deleted.test.ts');
  });

  it('accepts objects and backslash paths', () => {
    expect(plan([{ path: ['src', 'lib', 'b.test.ts'].join(String.fromCharCode(92)) }]).files).toContain('src/lib/b.test.ts');
  });

  it('an /about-style diff (a new route folder plus a nav file) puts navItems.test.ts in the plan through the guards', () => {
    const changed = ['src/app/about/page.tsx', 'src/app/about/About.tsx', 'src/components/shell/sidebar/navItems.ts', 'src/app/about/about.module.css'];
    const p = plan(changed);
    expect(p.files).toContain(nav);
    expect(p.guards).toContain(nav);
    expect(relatedSources(changed)).toHaveLength(3);
  });

  it('a broad change (related above 35% of all tests) runs only the unit-tier related tests, never the whole suite', () => {
    const many = Array.from({ length: 20 }, (_, i) => `src/w/t${String(i).padStart(2, '0')}.test.ts`);
    const tier = (f) => (f.endsWith('0.test.ts') ? 'db' : f.endsWith('1.test.ts') ? 'spawn' : 'unit');
    const input = { changed: ['src/w/core.ts', 'src/w/t00.test.ts'], allTests: many, guards: ['src/w/t10.test.ts'] };
    const related = many.slice(0, 8); // 8 of 20 = 40% > 35%
    expect(related.length * 100).toBeGreaterThan(BROAD_PERCENT * many.length);
    const p = planFor({ ...input, related }, tier);
    // changed test (t00, db) and guard (t10, db) still run; related db/spawn t01 is skipped; unit t02..t07 run
    expect(p.files).toEqual(['src/w/t00.test.ts', 'src/w/t02.test.ts', 'src/w/t03.test.ts', 'src/w/t04.test.ts', 'src/w/t05.test.ts', 'src/w/t06.test.ts', 'src/w/t07.test.ts', 'src/w/t10.test.ts']);
    expect(p.skipped).toEqual(['src/w/t01.test.ts']);
    expect(p.files.length).toBeLessThan(many.length);
    expect(p.reason).toContain('8 related, 6 of them unit');
    // at or under the share nothing is dropped, whatever the tier
    const narrow = planFor({ ...input, related: many.slice(0, 7) }, tier); // 35% exactly
    expect(narrow.skipped).toEqual([]);
    expect(narrow.files).toContain('src/w/t01.test.ts');
  });
});
