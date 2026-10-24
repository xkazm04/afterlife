// The track of an action class comes from its agent role (ROLE_TRACK in derive/tiers.ts), a table no other file derives.
// Held to the checked-in policy: every class trust-policy.yml names lands on a track, so no screen shows it as "T?".
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../../../../../../engine/policy/load';
import { ROLE_TRACK, trackOfRole, trustClassesOf } from '../../tiers';

describe('the agent role -> track table', () => {
  it('gives every class of policy/trust-policy.yml a track', () => {
    const classes = trustClassesOf(parsePolicy(parse(readFileSync('policy/trust-policy.yml', 'utf8'))));
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((c) => c.track === null).map((c) => `${c.id} (${c.agent})`)).toEqual([]);
  });

  it('names each of the eight tracks once', () => {
    expect(Object.values(ROLE_TRACK).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reads a role named like an Object property as no track', () => {
    expect(['constructor', 'toString', '__proto__'].map(trackOfRole)).toEqual([null, null, null]);
  });
});
