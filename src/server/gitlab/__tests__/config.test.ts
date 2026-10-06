import { describe, expect, it } from 'vitest';
import type { ExecFn } from '../adapter/exec';
import { DEFAULT_GROUP_ID, readConfig, resolveGlabBin, windowsFallback } from '../config';

describe('config', () => {
  it('defaults to the afterlife group and gitlab.com', () => {
    expect(readConfig({})).toEqual({ glab: undefined, host: undefined, groupId: DEFAULT_GROUP_ID });
    expect(DEFAULT_GROUP_ID).toBe('144060371');
  });

  it('reads BELAY_GLAB, BELAY_GITLAB_HOST and BELAY_GROUP_ID', () => {
    expect(readConfig({ BELAY_GLAB: 'C:\\x\\glab.exe', BELAY_GITLAB_HOST: 'git.example.com', BELAY_GROUP_ID: '7' })).toEqual({
      glab: 'C:\\x\\glab.exe', host: 'git.example.com', groupId: '7',
    });
  });
});

describe('resolveGlabBin', () => {
  const cfg = readConfig({});
  const onPath: ExecFn = async () => ({ code: 0, stdout: 'glab 1.120.0', stderr: '' });
  const notOnPath: ExecFn = async () => { throw new Error('ENOENT'); };

  it('BELAY_GLAB wins without running anything', async () => {
    expect(await resolveGlabBin({ ...cfg, glab: 'custom' }, notOnPath, {}, () => false)).toBe('custom');
  });

  it('uses glab from PATH when it runs', async () => {
    expect(await resolveGlabBin(cfg, onPath, { LOCALAPPDATA: 'C:\\L' }, () => true)).toBe('glab');
  });

  it('falls back to the winget install location when PATH has none', async () => {
    const env = { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' };
    const expected = windowsFallback(env);
    expect(expected).toMatch(/Programs[\\/]glab[\\/]glab\.exe$/);
    expect(await resolveGlabBin(cfg, notOnPath, env, (p) => p === expected)).toBe(expected);
  });

  it('keeps plain glab when nothing is found', async () => {
    expect(await resolveGlabBin(cfg, notOnPath, {}, () => false)).toBe('glab');
  });
});
