// fleet.yml's optional gitlab key: a project path the runner carries for Fleet's cost join, refused when it is not one.
import { describe, expect, it } from 'vitest';
import { parseFleet } from '../fleet/load';

const fleet = (extra: string) => `repos:\n  - slug: r\n    path: /x\n    base: main\n    gates: [npm test]\n${extra}`;

describe('fleet.yml gitlab key', () => {
  it('is optional, and carried when it is a project path', () => {
    expect(parseFleet(fleet(''), 'f.yml')[0]).not.toHaveProperty('gitlab');
    expect(parseFleet(fleet('    gitlab: acme-lab/core-banking/ledgerline\n'), 'f.yml')[0]?.gitlab).toBe('acme-lab/core-banking/ledgerline');
  });
  it.each(['/acme/x', 'acme/x/', 'acme x', '-x'])('refuses %j', (v) => {
    expect(() => parseFleet(fleet(`    gitlab: ${JSON.stringify(v)}\n`), 'f.yml')).toThrow(/gitlab/);
  });
  it('refuses a non-string', () => {
    expect(() => parseFleet(fleet('    gitlab: 42\n'), 'f.yml')).toThrow(/gitlab/);
  });
});
