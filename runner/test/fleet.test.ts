// fleet.yml: the optional gitlab key (a project path for Fleet's cost join, refused when it is not one) and how a repo path is read.
import path from 'node:path';
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

describe('fleet.yml repo path', () => {
  const at = (p: string) => `repos:\n  - slug: r\n    path: ${p}\n    base: main\n    gates: [npm test]\n`;
  const file = path.resolve('somewhere', 'work', 'fleet.yml');
  it('a relative path is read from the fleet file folder, not the process cwd', () => {
    expect(parseFleet(at('./ledgerline'), file)[0]?.path).toBe(path.resolve('somewhere', 'work', 'ledgerline'));
    expect(parseFleet(at('../my-service'), file)[0]?.path).toBe(path.resolve('somewhere', 'my-service'));
  });
  it('an absolute path is kept as written', () => {
    const abs = path.resolve('elsewhere', 'repo');
    expect(parseFleet(at(JSON.stringify(abs)), file)[0]?.path).toBe(abs);
  });
});
