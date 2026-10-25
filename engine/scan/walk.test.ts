import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { listFiles } from './walk';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-walk-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'ignore', windowsHide: true });

function repo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(tmp, 'repo-'));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), text);
  }
  git(dir, 'init', '-q');
  return dir;
}

describe('the file list of a git checkout', () => {
  it("takes git's list: past the walk's depth and entry limits, never an ignored folder, untracked files included", () => {
    const deep = 'a/b/c/d/e/f/g/h/i/j/infra/main.bicep';
    const dir = repo({ [deep]: 'param x string\n', CODEOWNERS: '* @team\n', '.gitignore': 'out/\n', 'out/main.tf': '', 'x/y.txt': '' });
    git(dir, 'add', 'CODEOWNERS');
    const l = listFiles(dir, { files: 200_000, depth: 2 });
    expect(Object.keys(l.files).sort()).toEqual(['CODEOWNERS', deep]);
    expect(l.gap).toBeNull();
  });

  it('says so when the list is longer than the cap', () => {
    const dir = repo({ 'a.txt': '', 'b.txt': '', 'main.tf': '' });
    expect(listFiles(dir, { files: 2, depth: 8 }).gap).toMatch(/git's file list was read up to 2 of 3 files/);
  });

  it('walks the folders of a subfolder of a work tree, which is not its top', () => {
    const dir = repo({ 'sub/main.tf': '', 'sub/x/y.txt': '' });
    const l = listFiles(path.join(dir, 'sub'), { files: 1, depth: 8 });
    expect(l.gap).toMatch(/the walk stopped at 1 entries/);
  });
});
