// repoPolicy answers null for a missing file, bad YAML and a policy the engine refuses alike; it must say which, once per root.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repoPolicy } from '../../policy';

let warn: ReturnType<typeof vi.spyOn>;
const roots: string[] = [];
const rootWith = (yml: string | null): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-policy-'));
  roots.push(root);
  if (yml !== null) {
    fs.mkdirSync(path.join(root, 'policy'));
    fs.writeFileSync(path.join(root, 'policy', 'trust-policy.yml'), yml);
  }
  return root;
};
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  warn.mockRestore();
  for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

describe('repoPolicy on a policy it cannot use', () => {
  it.each([
    ['a missing file', null],
    ['YAML that does not parse', 'a: [unclosed'],
    ['a policy the engine refuses', 'profile: 7\n'],
  ])('names the cause for %s, once per root', (_what, yml) => {
    const root = rootWith(yml);
    expect(repoPolicy(root)).toBeNull();
    expect(repoPolicy(root)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(path.join(root, 'policy', 'trust-policy.yml'));
  });

  it('says nothing for this checkout\'s own policy', () => {
    expect(repoPolicy(process.cwd())).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
