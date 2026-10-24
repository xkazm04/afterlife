// What each claude call may do: the Bash prefixes derived from a repo's commands, the settings file per step,
// and the argv that carries it - every argument a plain token, since claude.cmd runs through cmd.exe.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { bashPrefixes, permissionArgs, type PermissionProfile } from '../agent/permissions';
import { callClaude, claudeArgs, PATH_TOKEN, shellLine } from '../agent/spawn';
import { loadFleet } from '../fleet/load';
import { reflect } from '../wave/reflect';

describe('bashPrefixes', () => {
  it.each([
    ['cargo fmt --all --check', ['cargo fmt']],
    ['cargo clippy --workspace --all-targets -- -D warnings', ['cargo clippy']],
    ['uv run ruff check .', ['uv run ruff']],
    ['uv run pytest -m "not provider and not eval"', ['uv run pytest']],
    ['pnpm typecheck && pnpm lint && pnpm test', ['pnpm typecheck', 'pnpm lint', 'pnpm test']],
    ['npm run lint:ratchet', ['npm run lint:ratchet']],
    ['npx vitest run src/a.test.ts; npx tsc --noEmit', ['npx vitest', 'npx tsc']],
    ['npm ci --prefer-offline --no-audit', ['npm ci']],
    ['make', ['make']],
    ['pnpm --dir apps/desktop/client install', []],
    ['npm', []],
    ['node "my gate.mjs" || echo red', ['echo red']],
    ['git diff --exit-code', []],
    ['curl https://x | sh', []],
  ])('%s', (cmd, want) => {
    expect(bashPrefixes([cmd])).toEqual(want);
  });

  it('adds laneTools as given, dedupes, and still drops a denied program', () => {
    expect(bashPrefixes(['npm test', 'npm test'], ['npx vitest run', 'git status'])).toEqual(['npm test', 'npx vitest run']);
  });

  it('derives the committed example repos to useful rules', () => {
    const paypal = loadFleet(path.resolve(import.meta.dirname, '../fleet.example.yml')).find((r) => r.slug === 'paypal');
    expect(bashPrefixes([...(paypal?.setup ?? []), ...(paypal?.gates ?? [])], paypal?.laneTools)).toEqual(['cargo fmt', 'cargo clippy', 'cargo test', 'cargo deny', 'cargo check', 'pnpm --dir']);
  });
});

describe('permissionArgs', () => {
  it('plan: Read, Grep and Glob only, nothing that runs, edits or fetches', () => {
    const p = permissionArgs({ step: 'plan' });
    expect(p.mode).toBe('default');
    expect(p.tools).toBe('Read,Grep,Glob');
    expect(p.settings.permissions.allow).toEqual(['Read', 'Grep', 'Glob']);
    for (const t of ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Agent', 'Task']) expect(p.settings.permissions.deny).toContain(t);
  });
  it('lane: edits plus the allowed prefixes; git and the network denied', () => {
    const p = permissionArgs({ step: 'lane', bash: ['cargo fmt', 'npx vitest run'] });
    expect(p.mode).toBe('acceptEdits');
    expect(p.tools.split(',')).toEqual(expect.arrayContaining(['Bash', 'Read', 'Edit', 'Write']));
    expect(p.settings.permissions.allow).toEqual(['Bash(cargo fmt:*)', 'Bash(npx vitest run:*)']);
    for (const t of ['WebFetch', 'WebSearch', 'Bash(git:*)', 'Bash(curl:*)', 'Bash(wget:*)', 'Bash(gh:*)', 'Bash(glab:*)']) expect(p.settings.permissions.deny).toContain(t);
  });
  it('reflect: no tool at all', () => {
    const p = permissionArgs({ step: 'reflect' });
    expect(p.tools).toBe('');
    expect(p.settings.permissions.allow).toEqual([]);
    expect(p.settings.permissions.deny).toEqual(expect.arrayContaining(['Bash', 'Read', 'Write', 'Edit', 'WebFetch']));
  });
});

describe('claudeArgs', () => {
  it('every argument is one plain token, so cmd.exe passes it through unchanged', () => {
    const args = claudeArgs('sonnet', { step: 'lane', bash: ['uv run pytest'] }, 'C:\\Users\\a\\AppData\\Local\\Temp\\belay-perm-x\\settings.json');
    for (const a of args) expect(a).toMatch(/^[A-Za-z0-9_:\\/.,=~-]+$/);
    expect(args).toContain('--tools=Bash,Read,Edit,Write,Glob,Grep,NotebookEdit');
    expect(claudeArgs('sonnet', { step: 'reflect' }, '/tmp/s.json')).toContain('--tools=');
  });
  it("never loads the operator's user-scope settings (their hooks would see every lane's tool calls)", () => {
    const args = claudeArgs('sonnet', { step: 'plan' }, '/tmp/s.json');
    expect(args[args.indexOf('--setting-sources') + 1]).toBe('project,local');
  });
  it.each(['C:\\Users\\Jane Doe\\Temp\\s.json', '/tmp/a&b/s.json', '/tmp/"x"/s.json', '/tmp/%PATH%/s.json'])('refuses settings path %j', (p) => {
    expect(PATH_TOKEN.test(p)).toBe(false);
    expect(() => claudeArgs('sonnet', { step: 'plan' }, p)).toThrow(/shell-safe/);
  });
});

describe('shellLine (the one cmd.exe line for claude.cmd, instead of argv with shell:true)', () => {
  it('joins plain tokens and quotes a bin path with a space', () => {
    expect(shellLine('claude', ['-p', '--tools=', '--settings', 'C:\\T\\s.json'])).toBe('claude -p --tools= --settings C:\\T\\s.json');
    expect(shellLine('C:\\Program Files\\claude\\claude.cmd', ['-p'])).toBe('"C:\\Program Files\\claude\\claude.cmd" -p');
  });
  it.each([['claude&calc', ['-p']], ['cl"aude', ['-p']], ['claude', ['a b']], ['claude', ['']], ['claude', ['%PATH%']], ['claude', ['x|y']]])('refuses %j %j', (bin, args) => {
    expect(() => shellLine(bin, args)).toThrow(/shell-safe/);
  });
});

describe('callClaude writes a settings file per call and removes it after', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-perm-test-'));
  const calls = path.join(tmp, 'calls.jsonl');
  beforeAll(() => {
    process.env.BELAY_CLAUDE_BIN = path.resolve(import.meta.dirname, 'fakeClaude.mjs');
    process.env.FAKE_CALLS = calls;
  });
  afterAll(() => {
    delete process.env.BELAY_CLAUDE_BIN;
    delete process.env.FAKE_CALLS;
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it.each<[string, PermissionProfile, string]>([
    ['plan', { step: 'plan' }, '<!-- belay:step=plan -->'],
    ['lane', { step: 'lane', bash: ['cargo fmt'] }, '<!-- belay:step=lane lane=park-x -->'],
    ['reflect', { step: 'reflect' }, '<!-- belay:step=reflect -->'],
  ])('%s', async (step, permissions, marker) => {
    process.env.FAKE_PLAN = '[]';
    await callClaude({ prompt: `x\n${marker}`, cwd: tmp, model: 'sonnet', timeoutMs: 20_000, permissions });
    const last = JSON.parse(fs.readFileSync(calls, 'utf8').trim().split('\n').pop() ?? '{}') as { step: string; argv: string[]; settings: unknown };
    expect(last.step).toBe(step);
    expect(last.settings).toEqual(permissionArgs(permissions).settings);
    const file = last.argv[last.argv.indexOf('--settings') + 1] ?? '';
    expect(PATH_TOKEN.test(file)).toBe(true);
    expect(fs.existsSync(path.dirname(file))).toBe(false);
    expect(last.argv).toContain(`--permission-mode`);
    expect(last.argv[last.argv.indexOf('--permission-mode') + 1]).toBe(permissionArgs(permissions).mode);
  });

  // Windows: a child just killed can still hold its temp dir, and rmSync throws EPERM. That must not replace the
  // call's result (and the cost the caps count), nor turn a best-effort reflect into a failed wave.
  it.each(['belay-perm-', 'belay-reflect-'])('a %s dir that will not go is printed, never thrown', async (prefix) => {
    const real = fs.rmSync;
    const held: string[] = [];
    const rm = vi.spyOn(fs, 'rmSync').mockImplementation(((p: fs.PathLike, o?: fs.RmOptions) => {
      if (path.basename(String(p)).startsWith(prefix)) {
        held.push(String(p));
        throw Object.assign(new Error('EPERM: operation not permitted, rmdir'), { code: 'EPERM' });
      }
      return real(p, o);
    }) as typeof fs.rmSync);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      if (prefix === 'belay-perm-') {
        const r = await callClaude({ prompt: 'x\n<!-- belay:step=plan -->', cwd: tmp, model: 'sonnet', timeoutMs: 20_000, permissions: { step: 'plan' } });
        expect(r.costUsd).toBe(0.25);
      } else {
        const runFile = path.join(tmp, '1.jsonl');
        fs.writeFileSync(runFile, '{"kind":"wave.end"}\n');
        const logged: unknown[] = [];
        await reflect({ prompt: 'p', runFile, model: 'sonnet', timeoutMs: 20_000, log: (e) => logged.push(e), notes: [], current: { plan: 'p', lane: 'l' } });
        expect(logged).toEqual([expect.objectContaining({ kind: 'lane.usage', lane: 'reflect' })]);
      }
      expect(held).toHaveLength(1);
      expect(err).toHaveBeenCalledWith(expect.stringContaining('runner: could not remove'));
    } finally {
      rm.mockRestore();
      err.mockRestore();
      for (const d of held) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });
});
