import { describe, expect, it } from 'vitest';
import { STEP_ORDER, stepOf, type StepFacts } from './catalog';

const codes = (key: Parameters<typeof stepOf>[0], f: StepFacts = { host: 'gitlab.com', groupId: '1', platform: 'linux' }): string[] =>
  stepOf(key).commands(f).flatMap((l) => (typeof l === 'string' ? [l] : l.code ? [l.code] : []));

describe('start steps', () => {
  it('runs in the one order: repo first, the unlock map last', () => {
    expect(STEP_ORDER).toEqual(['repo', 'glab', 'login', 'group', 'live', 'stack', 'save', 'unlock']);
  });
  it('gives every env command a POSIX and a PowerShell line under the Afterlife name, and no cmd.exe set', () => {
    for (const [key, name] of [['group', 'AFTERLIFE_GROUP_ID'], ['live', 'AFTERLIFE_MODE']] as const) {
      const c = codes(key);
      expect(c.some((l) => new RegExp(`^(export )?${name}=`).test(l))).toBe(true);
      expect(c.some((l) => l.startsWith(`$env:${name}=`))).toBe(true);
      expect(c.some((l) => l.startsWith('set ') || l.includes('BELAY_'))).toBe(false);
    }
  });
  it('fills the derived group id and the host, and installs glab by platform', () => {
    expect(codes('group', { host: 'gitlab.com', groupId: '777', platform: 'linux' })[0]).toBe('export AFTERLIFE_GROUP_ID=777');
    expect(codes('login', { host: 'gl.acme.io', groupId: '1', platform: 'linux' })).toEqual(['glab auth login --hostname gl.acme.io']);
    expect(codes('glab', { host: 'gitlab.com', groupId: '1', platform: 'windows' })).toEqual(['winget install GLab.GLab']);
    expect(codes('glab', { host: 'gitlab.com', groupId: '1', platform: 'macos' })).toEqual(['brew install glab']);
  });
});
