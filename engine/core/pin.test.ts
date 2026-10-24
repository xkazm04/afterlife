// The engine pin is the import closure of engine/cli.ts: what runs, wherever it lives, and nothing that merely sits
// in the folder. These cases build small temp trees and hash them with engineSha256({root, entry}).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { capture, fx, ROOT } from '../__tests__/helpers';
import { main } from '../cli';
import { EngineError } from './types';
import { ENGINE_VERSION, engineFiles, engineInfo, engineSha256 } from './version';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-pin-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

let n = 0;
function tree(files: Record<string, string>): string {
  const root = path.join(tmp, `t${n++}`);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const put = (root: string, rel: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const sha = (root: string) => engineSha256({ root, entry: 'engine/cli.ts' });
const base = () =>
  tree({
    'engine/cli.ts': "import { t } from '../src/rule.ts';\nimport { u } from './core/util';\nexport const v = t + u;\n",
    'engine/core/util.ts': "export { w as u } from './deep';\n",
    'engine/core/deep/index.ts': 'export const w = 1;\n',
    'src/rule.ts': 'export const t = 1;\n',
  });

describe('engineFiles: the pinned set is what engine/cli.ts imports', () => {
  it('reaches the rules in src/schemas, and no test, __tests__ or __fixtures__ file', () => {
    const files = engineFiles();
    for (const f of ['engine/cli.ts', 'src/schemas/proof.ts', 'src/schemas/trial.ts', 'src/schemas/ledger.ts', 'src/schemas/tier.ts', 'src/schemas/cra.ts', 'src/schemas/maturity.ts', 'src/schemas/chain/kinds.ts', 'src/schemas/chain/parse.ts']) {
      expect(files).toContain(f);
    }
    expect(files).toEqual([...files].sort());
    expect(files.filter((f) => f.endsWith('.test.ts') || f.includes('__tests__/') || f.includes('__fixtures__/'))).toEqual([]);
  });
});

describe('engineSha256 over the import closure', () => {
  it('moves when an imported file outside engine/ changes', () => {
    const root = base();
    const before = sha(root);
    put(root, 'src/rule.ts', 'export const t = 2;\n');
    expect(sha(root)).not.toBe(before);
  });

  it('does not move for a file nothing imports, in engine/ or outside it', () => {
    const root = base();
    const before = sha(root);
    put(root, 'src/unrelated.ts', 'export const x = 1;\n');
    put(root, 'engine/dead.ts', 'export const y = 1;\n');
    expect(sha(root)).toBe(before);
    put(root, 'src/unrelated.ts', 'export const x = 2;\n');
    put(root, 'engine/dead.ts', 'export const y = 2;\n');
    expect(sha(root)).toBe(before);
  });

  it('ignores line endings, tests, fixtures and docs', () => {
    const root = base();
    const before = sha(root);
    put(root, 'src/rule.ts', 'export const t = 1;\r\n');
    put(root, 'engine/core/deep/index.ts', 'export const w = 1;\r\n');
    put(root, 'engine/cli.test.ts', "import { v } from './cli';\n");
    put(root, 'engine/__fixtures__/x.ts', 'noise');
    put(root, 'engine/README.md', 'noise');
    expect(sha(root)).toBe(before);
  });

  it('fails closed on an import it cannot resolve or an alias, naming the specifier', () => {
    const missing = tree({ 'engine/cli.ts': "import { m } from './missing';\n" });
    expect(() => sha(missing)).toThrow(EngineError);
    expect(() => sha(missing)).toThrow(/\.\/missing/);
    const alias = tree({ 'engine/cli.ts': "import type { X } from '@/schemas/x';\n" });
    expect(() => sha(alias)).toThrow(EngineError);
    expect(() => sha(alias)).toThrow(/@\/schemas\/x/);
  });
});

describe('engine pin through the CLI', () => {
  const run = (...argv: string[]) => {
    const c = capture();
    const code = main(argv, c.io);
    return { code, json: c.json() as Record<string, unknown> };
  };

  it('pin prints {version, sha256, files}, the same sha a Proof Block carries', () => {
    const pin = run('pin');
    expect(pin.code).toBe(0);
    expect(pin.json).toEqual({ version: ENGINE_VERSION, sha256: engineInfo().sha256, files: engineFiles() });
    const proof = run('prove', '--class', 'exploit-test', '--input', fx('exploit', 'input.pass.json'));
    expect((proof.json.engine as { sha256: string }).sha256).toBe(pin.json.sha256);
  });

  it('gate --engine-sha: the pin passes the build check, any other sha blocks', () => {
    const proofFile = path.join(tmp, 'proof.json');
    fs.writeFileSync(proofFile, JSON.stringify(run('prove', '--class', 'exploit-test', '--input', fx('exploit', 'input.pass.json')).json));
    const gate = (...extra: string[]) =>
      run('gate', '--state', path.join(ROOT, 'policy', 'tier-state.yml'), '--class', 'dep-bump.patch', '--proof', proofFile, '--guardrail', fx('events', 'guardrail-pass.json'), ...extra);
    const DIFFERENT = /different engine build/;
    const plain = gate();
    const pinned = gate('--engine-sha', run('pin').json.sha256 as string);
    expect(pinned.json).toEqual(plain.json);
    expect(JSON.stringify(pinned.json.reasons)).not.toMatch(DIFFERENT);
    const other = gate('--engine-sha', '0'.repeat(64));
    expect(other.json.decision).toBe('block');
    expect(JSON.stringify(other.json.reasons)).toMatch(DIFFERENT);
  });
});
