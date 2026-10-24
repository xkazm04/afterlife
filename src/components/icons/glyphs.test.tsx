// One icon pipeline: the toolbar and sidebar glyphs live in GLYPHS and render through <Icon>, which owns the
// size x --ui-scale rule. A hand-drawn <svg> at these sites would bring back a private scale rule in a stylesheet.
// The sites are derived, not listed: every file that draws a toolbar control (imports controls/toolbar or
// controls/lozenge) is a toolbar site, plus the sidebar and chrome marks named below.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLYPHS } from './glyphs';

const SRC = path.resolve(__dirname, '../..');
const FEATURES = path.join(SRC, 'app/features');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const rel = (f: string): string => path.relative(FEATURES, f).split(path.sep).join('/');
const code = (f: string): string => strip(readFileSync(f, 'utf8'));

/** Sidebar and chrome marks that draw no toolbar control, with the glyph each one moved into GLYPHS. */
const MARKS: readonly (readonly [string, string])[] = [
  ['task/components/toolbar/ReplayButton.tsx', 'play'],
  ['setup/components/toolbar/SetupToolbar.tsx', 'probe'],
  ['needs-you/components/chrome/OutboxIcon.tsx', 'outbox'],
  ['fleet/components/table/FleetHeader.tsx', 'ring'],
  ['ladder/components/sidebar/smartIcons.tsx', 'promote'],
  ['ladder/components/chrome/PolicyLozenge.tsx', 'branch'],
];
/** Toolbar sites that still hand-draw a glyph, each owed a move into GLYPHS. A ratchet: the list may only shrink. */
const OWED: Readonly<Record<string, string>> = {};

const toolbarSites = walk(FEATURES)
  .filter((f) => f.endsWith('.tsx') && !/\.test\.tsx$/.test(f))
  .filter((f) => /from '@\/components\/controls\/(toolbar|lozenge)\//.test(code(f)))
  .map(rel);
const sites = [...new Set([...toolbarSites, ...MARKS.map(([f]) => f)])];
const draws = (f: string): boolean => code(path.join(FEATURES, f)).includes('<svg');

describe('toolbar glyphs', () => {
  it('finds the toolbar sites on disk (the walk is not empty)', () => {
    expect(toolbarSites.length).toBeGreaterThan(15);
  });
  it('lets no toolbar or sidebar site hand-draw an <svg>, beyond the owed ones', () => {
    expect(sites.filter((f) => draws(f) && !Object.hasOwn(OWED, f))).toEqual([]);
  });
  it('keeps no stale owed entry: each is still a site and still draws its own <svg>', () => {
    expect(Object.keys(OWED).filter((f) => !sites.includes(f) || !draws(f))).toEqual([]);
  });
  it.each(MARKS)('%s draws its glyph (%s) from the registry', (_f, name) => {
    expect(Object.keys(GLYPHS)).toContain(name);
  });
});
