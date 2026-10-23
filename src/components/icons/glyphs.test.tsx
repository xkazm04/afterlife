// One icon pipeline: the toolbar and sidebar glyphs live in GLYPHS and render through <Icon>, which owns the
// size x --ui-scale rule. A hand-drawn <svg> at these sites would bring back a private scale rule in a stylesheet.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLYPHS } from './glyphs';

const SITES: readonly (readonly [string, string])[] = [
  ['task/components/toolbar/ReplayButton.tsx', 'play'],
  ['setup/components/toolbar/SetupToolbar.tsx', 'probe'],
  ['needs-you/components/chrome/OutboxIcon.tsx', 'outbox'],
  ['fleet/components/table/FleetHeader.tsx', 'ring'],
  ['ladder/components/sidebar/smartIcons.tsx', 'promote'],
  ['ladder/components/chrome/PolicyLozenge.tsx', 'branch'],
];
const source = (rel: string) => readFileSync(path.resolve(__dirname, '../../app/features', rel), 'utf8');

describe('toolbar glyphs', () => {
  it.each(SITES)('%s draws no inline <svg>, and its glyph (%s) is registered', (rel, name) => {
    expect(source(rel)).not.toContain('<svg');
    expect(Object.keys(GLYPHS)).toContain(name);
  });
});
