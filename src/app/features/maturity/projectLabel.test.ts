// The window subtitle is written once: the live project, or the demo project spelled with spaces around the slash.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAT_META, projectLabel } from './data/meta';

const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('projectLabel', () => {
  it('is the live project in live mode', () => {
    expect(projectLabel({ live: true }, 'ledgerline')).toBe('ledgerline');
  });
  it('is the demo project, spaced, in demo mode', () => {
    expect(projectLabel({ live: false }, 'ledgerline')).toBe('acme-lab / ledgerline');
    expect(projectLabel({ live: false }, 'ledgerline')).toBe(MAT_META.project.replace('/', ' / '));
  });
});

describe('the two screens', () => {
  it.each(['./MaturityScreen.tsx', './StageScreen.tsx'])('%s does not spell the label itself', (rel) => {
    const src = stripComments(readFileSync(new URL(rel, import.meta.url), 'utf8'));
    expect(src).not.toMatch(/MAT_META\.project\.replace/);
  });
});
