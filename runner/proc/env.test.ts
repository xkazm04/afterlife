// The runner's own env helper: AFTERLIFE_* wins, BELAY_* is the fallback, and the data folder keeps an old .belay.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dotDirAt, envOf } from './env';

describe('runner env', () => {
  it('reads AFTERLIFE_<key>, falls back to BELAY_<key>, and an empty value is unset', () => {
    expect(envOf({ AFTERLIFE_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ BELAY_MODE: 'live' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: 'live', BELAY_MODE: 'demo' }, 'MODE')).toBe('live');
    expect(envOf({ AFTERLIFE_MODE: '' }, 'MODE')).toBeUndefined();
  });

  it('is .afterlife, but keeps a pre-rename .belay while no .afterlife exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-runner-env-'));
    try {
      expect(dotDirAt(dir)).toBe(path.join(dir, '.afterlife'));
      fs.mkdirSync(path.join(dir, '.belay'));
      expect(dotDirAt(dir)).toBe(path.join(dir, '.belay'));
      fs.mkdirSync(path.join(dir, '.afterlife'));
      expect(dotDirAt(dir)).toBe(path.join(dir, '.afterlife'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
