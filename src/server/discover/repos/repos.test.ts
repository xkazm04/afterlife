// "Your repos" over a fixture ~/.claude/projects: each dir's newest session gives the cwd, scratch and vanished paths
// are dropped, sub-folders fold onto their toplevel, and the newest session orders the list.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { scanClaudeRepos } from './repos';
import { hostKindOf, parseRemote, scrubRemote } from './remote';
import { firstCwd, isScratchPath } from './sessions';

const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'ignore' });

let base = '';
afterEach(() => base && rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function repo(name: string, remote?: string): string {
  const dir = path.join(base, name);
  mkdirSync(path.join(dir, 'sub'), { recursive: true });
  execFileSync('git', ['init', '-q', '-b', 'main', dir], { stdio: 'ignore' });
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'init');
  if (remote) git(dir, 'remote', 'add', 'origin', remote);
  return dir;
}

/** A project dir with one session file per [name, cwd line, age in minutes]. */
function sessions(dir: string, files: [string, string, number][]): void {
  const d = path.join(base, 'projects', dir);
  mkdirSync(d, { recursive: true });
  for (const [name, body, ageMin] of files) {
    const f = path.join(d, name);
    writeFileSync(f, body);
    const t = new Date(Date.UTC(2026, 9, 25, 12) - ageMin * 60_000);
    utimesSync(f, t, t);
  }
}

const line = (cwd: string) => `${JSON.stringify({ type: 'user', cwd, sessionId: 'x' })}\n`;
const scratch = (p: string) => isScratchPath(path.relative(base, p));

describe('scanClaudeRepos', () => {
  it('reads the newest session per dir, drops scratch and vanished paths, folds onto the toplevel, newest first', async () => {
    base = mkdtempSync(path.join(tmpdir(), 'afterlife-repos-'));
    const a = repo('alpha', 'https://Grinex@dev.azure.com/Grinex/Grinex%20Portal/_git/Grinex%20Portal');
    const b = repo('beta', 'git@gitlab.com:acme/beta.git');
    mkdirSync(path.join(base, 'build-session-1'));
    sessions('alpha-old', [['old.jsonl', line(path.join(base, 'gone')), 1], ['new.jsonl', `{"type":"summary"}\n${line(path.join(a, 'sub'))}`, 30]]);
    sessions('alpha-root', [['s.jsonl', line(a), 300]]);
    sessions('beta', [['s.jsonl', line(b), 10]]);
    sessions('scratch', [['s.jsonl', line(path.join(base, 'build-session-1')), 0]]);
    sessions('vanished', [['s.jsonl', line(path.join(base, 'nowhere')), 0]]);
    sessions('no-cwd', [['s.jsonl', '{"type":"summary"}\n', 0], ['notes.txt', line(a), 0]]);
    const projects = [{ slug: 'grinex-portal', root: a.replace(/\\/g, '/') }] as ProjectConfig[];

    const repos = await scanClaudeRepos(path.join(base, 'projects'), projects, scratch);

    // alpha-old's newest file names a cwd that is gone, and only the newest file is read: alpha is listed through alpha-root.
    expect(repos.map((r) => r.name)).toEqual(['beta', 'Grinex Portal']);
    const [beta, alpha] = repos;
    expect(beta).toMatchObject({ branch: 'main', hostKind: 'gitlab', remote: 'git@gitlab.com:acme/beta.git' });
    expect(beta?.onboarded).toBeUndefined();
    expect(alpha).toMatchObject({ hostKind: 'azure-devops', remote: 'https://dev.azure.com/Grinex/Grinex%20Portal/_git/Grinex%20Portal', onboarded: 'grinex-portal' });
    expect(alpha?.lastUsed).toBe(new Date(Date.UTC(2026, 9, 25, 12) - 300 * 60_000).toISOString());
    expect(path.resolve(alpha!.root)).toBe(path.resolve(a));
  });

  it('a sub-folder session and a root session of one repo are one repo, used when the newer was', async () => {
    base = mkdtempSync(path.join(tmpdir(), 'afterlife-repos-'));
    const a = repo('alpha');
    sessions('alpha-sub', [['s.jsonl', line(path.join(a, 'sub')), 5]]);
    sessions('alpha', [['s.jsonl', line(a), 50]]);
    const repos = await scanClaudeRepos(path.join(base, 'projects'), [], scratch);
    expect(repos).toHaveLength(1);
    expect(repos[0]).toMatchObject({ name: 'alpha', hostKind: 'none', lastUsed: new Date(Date.UTC(2026, 9, 25, 12) - 5 * 60_000).toISOString() });
    expect(repos[0]?.remote).toBeUndefined();
  });

  it('no projects dir is no repos', async () => {
    base = mkdtempSync(path.join(tmpdir(), 'afterlife-repos-'));
    expect(await scanClaudeRepos(path.join(base, 'missing'), [])).toEqual([]);
  });
});

describe('sessions and remotes', () => {
  it('drops temp, build-session, reflect and worktree paths with either slash, case-insensitively', () => {
    for (const p of ['C:\\Users\\a\\AppData\\Local\\Temp\\x', '/tmp/afterlife-1', '/tmp', 'C:/w/Build-Session-3', 'D:\\belay-reflect-9', 'D:\\afterlife-reflect-9', 'C:\\r\\.claude\\worktrees\\lane-1', 'C:/r/.CLAUDE/Worktrees/x']) {
      expect(isScratchPath(p), p).toBe(true);
    }
    for (const p of ['C:\\Users\\mkdol\\refactoring', '/home/a/tmpfiles', 'C:/r/.claude']) expect(isScratchPath(p), p).toBe(false);
  });

  it('finds a cwd past a long first line, and none past the 64 KB cap', () => {
    base = mkdtempSync(path.join(tmpdir(), 'afterlife-repos-'));
    const f = path.join(base, 'a.jsonl');
    writeFileSync(f, `${JSON.stringify({ pad: 'x'.repeat(40_000) })}\n${line('C:\\r')}`);
    expect(firstCwd(f)).toBe('C:\\r');
    writeFileSync(f, `${JSON.stringify({ pad: 'x'.repeat(70_000) })}\n${line('C:\\r')}`);
    expect(firstCwd(f)).toBeUndefined();
    writeFileSync(f, `{"cwd":"C:\\\\cut","pad":"${'y'.repeat(70_000)}"}`);
    expect(firstCwd(f)).toBe('C:\\cut');
  });

  it('reads the host from a remote and never keeps its userinfo', () => {
    expect(scrubRemote('https://user:tok@gitlab.com/a/b.git')).toBe('https://gitlab.com/a/b.git');
    expect(parseRemote('https://Grinex@dev.azure.com/Grinex/Grinex%20Portal/_git/Grinex%20Portal')).toEqual({
      kind: 'azure-devops', url: 'https://dev.azure.com/Grinex/Grinex%20Portal/_git/Grinex%20Portal', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal',
    });
    expect(parseRemote('git@ssh.dev.azure.com:v3/acme/Shop/shop-web')).toMatchObject({ org: 'acme', project: 'Shop', repo: 'shop-web' });
    expect(parseRemote('https://acme.visualstudio.com/DefaultCollection/Shop/_git/web')).toMatchObject({ org: 'acme', project: 'Shop', repo: 'web' });
    expect(parseRemote('git@gitlab.com:group/sub/proj.git')).toMatchObject({ kind: 'gitlab', path: 'group/sub/proj', repo: 'proj' });
    expect(hostKindOf('https://github.com/a/b')).toBe('github');
    expect(hostKindOf('https://example.org/a/b')).toBe('none');
  });
});
