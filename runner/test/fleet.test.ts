// fleet.yml: the optional gitlab key (a project path for Fleet's cost join, refused when it is not one), how a repo path is
// read, and the saved projects whose runner block joins the fleet (fleet.yml winning a clash).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFleet, parseFleet } from '../fleet/load';

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

describe('saved projects join the fleet', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-fleet-proj-'));
  const project = (slug: string, extra = '') => `slug: ${slug}\nname: X\nroot: ${JSON.stringify(path.resolve('/work', slug))}\n${extra}`;
  const RUNNER = 'runner:\n  gates: [pytest release-log]\n  setup: [pip install -r requirements.txt]\n  frontier:\n    objective: faster tests\n    metrics:\n      - {name: test wall, command: pytest -q, parse: {kind: wall}, direction: down, threshold: 0.1}\n';

  it('reads a project YAML runner block as a FleetRepo, with origin/HEAD as its base', () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, 'projects'));
    fs.writeFileSync(path.join(dir, 'projects', 'grinex-portal.yml'), project('grinex-portal', RUNNER));
    fs.writeFileSync(path.join(dir, 'projects', 'plain.yml'), project('plain')); // no runner block: not a runner repo
    const repos = loadFleet(path.join(dir, 'fleet.yml'), { dataDir: dir, baseOf: () => 'master', warn: () => {} });
    expect(repos).toEqual([{ slug: 'grinex-portal', path: path.resolve('/work', 'grinex-portal'), base: 'master', gates: ['pytest release-log'], setup: ['pip install -r requirements.txt'], frontier: { objective: 'faster tests', metrics: [{ name: 'test wall', command: 'pytest -q', parse: { kind: 'wall' }, direction: 'down', threshold: 0.1 }] } }]);
  });

  it('fleet.yml wins a slug clash, with a warning; a bad runner block still stops the load', () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, 'projects'));
    fs.writeFileSync(path.join(dir, 'fleet.yml'), 'repos:\n  - {slug: grinex-portal, path: /mine, base: dev, gates: [make]}\n');
    fs.writeFileSync(path.join(dir, 'projects', 'grinex-portal.yml'), project('grinex-portal', RUNNER));
    const warned: string[] = [];
    const repos = loadFleet(path.join(dir, 'fleet.yml'), { dataDir: dir, baseOf: () => 'master', warn: (m) => warned.push(m) });
    expect(repos.map((r) => [r.slug, r.base])).toEqual([['grinex-portal', 'dev']]);
    expect(warned).toEqual([expect.stringMatching(/grinex-portal is in .*fleet.yml and is a saved project; .*fleet.yml wins/)]);
    fs.writeFileSync(path.join(dir, 'projects', 'other.yml'), project('other', 'runner:\n  gates: []\n'));
    expect(() => loadFleet(path.join(dir, 'fleet.yml'), { dataDir: dir, baseOf: () => 'master', warn: () => {} })).toThrow(/other.yml: runner: gates must be a non-empty list/);
  });

  it('skips a project with no default branch, and a missing fleet.yml with no project is still an error', () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, 'projects'));
    fs.writeFileSync(path.join(dir, 'projects', 'grinex-portal.yml'), project('grinex-portal', RUNNER));
    const warned: string[] = [];
    expect(() => loadFleet(path.join(dir, 'fleet.yml'), { dataDir: dir, baseOf: () => undefined, warn: (m) => warned.push(m) })).toThrow(/ENOENT/);
    expect(warned[0]).toMatch(/skipped: no default branch/);
  });
});
