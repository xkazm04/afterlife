// apply-gate.mjs runs in GitLab CI and cannot import src/, so it spells the tier list itself. This pins that copy to the
// schema's TIER_ORDER: a tier added to the schema fails here until the script takes it.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIER_ORDER } from '../../../../src/schemas/tier';

const source = fs.readFileSync(new URL('./apply-gate.mjs', import.meta.url), 'utf8');
const code = source.replace(/^\s*\/\/.*$/gm, '');
const listed = (name) => {
  const at = code.indexOf(`const ${name} = [`);
  if (at < 0) return null;
  const body = code.slice(code.indexOf('[', at) + 1, code.indexOf(']', at));
  return [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
};

describe('apply-gate tier vocabulary', () => {
  it('TIERS is the schema TIER_ORDER, in order', () => {
    expect(listed('TIERS')).toEqual([...TIER_ORDER]);
  });
});
