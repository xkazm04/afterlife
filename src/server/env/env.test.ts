// The env under the product's name: AFTERLIFE_<KEY> wins over BELAY_<KEY>, either wins over a runtime setting, and a
// setting fills a key neither name sets - through every config reader the runtime uses (data, gitlab, poller).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readDataConfig } from '@/server/data/config';
import { readConfig } from '@/server/gitlab/config';
import { readPollerConfig } from '@/server/poller/config';
import { envOf, serverEnv, sourceOf } from './env';
import { writeSettings } from './settings';

let dir = '';
let base: Record<string, string | undefined> = {};
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'afterlife-env-'));
  base = { AFTERLIFE_DATA_DIR: dir };
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

describe('envOf', () => {
  it('reads AFTERLIFE_ first, BELAY_ second, and an empty value as unset', () => {
    expect(envOf({ AFTERLIFE_MODE: 'live', BELAY_MODE: 'demo' }, 'MODE')).toBe('live');
    expect(envOf({ BELAY_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: '', BELAY_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: '' }, 'MODE')).toBeUndefined();
  });
});

describe('the config readers', () => {
  it('select live from either name, AFTERLIFE winning when both are set', () => {
    expect(readDataConfig({ AFTERLIFE_MODE: 'live' }).mode).toBe('live');
    expect(readDataConfig({ BELAY_MODE: 'live' }).mode).toBe('live');
    expect(readDataConfig({ AFTERLIFE_MODE: 'demo', BELAY_MODE: 'live' }).mode).toBe('demo');
    expect(readDataConfig({ AFTERLIFE_GITLAB: 'fake', AFTERLIFE_PROJECT: 'api' })).toMatchObject({ gitlab: 'fake', deepProject: 'api' });
    expect(readConfig({ AFTERLIFE_GROUP_ID: '1', BELAY_GROUP_ID: '2', AFTERLIFE_GITLAB_HOST: 'https://git.example.com/', AFTERLIFE_GLAB: '/bin/glab' }))
      .toEqual({ groupId: '1', host: 'git.example.com', glab: '/bin/glab' });
  });

  it('take a runtime setting where neither name is set, and never over either', () => {
    writeSettings({ groupId: '555', mode: 'live', host: 'git.example.com', project: 'api', proofAuthors: 'op' }, base);
    const env = serverEnv(base);
    expect(readDataConfig(env)).toMatchObject({ mode: 'live', deepProject: 'api' });
    expect(readConfig(env)).toMatchObject({ groupId: '555', host: 'git.example.com' });
    expect(readPollerConfig('555', env).proof.names).toEqual(['op']); // the live problems see the setting too: nothing is missing
    const over = serverEnv({ ...base, BELAY_GROUP_ID: '777', AFTERLIFE_MODE: 'demo' });
    expect([readConfig(over).groupId, readDataConfig(over).mode]).toEqual(['777', 'demo']);
  });

  it('say which source set each key', () => {
    writeSettings({ groupId: '555' }, base);
    expect(sourceOf(base, 'GROUP_ID')).toBe('setting');
    expect(sourceOf({ ...base, BELAY_GROUP_ID: '1' }, 'GROUP_ID')).toBe('env');
    expect(sourceOf(base, 'MODE')).toBe('unset');
  });
});
