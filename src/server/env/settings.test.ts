// The runtime settings file: what is written reads back, a hand edit that breaks a value drops that value (never the
// file), an undefined patch key removes the setting, and the write never leaves a temp file behind.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanSettings, dataDirOf, readSettings, settingsFile, writeSettings } from './settings';

let dir = '';
let env: Record<string, string | undefined> = {};
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'afterlife-settings-'));
  env = { AFTERLIFE_DATA_DIR: path.join(dir, 'data') };
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

describe('the settings file', () => {
  it('is no settings while it does not exist, or does not parse', () => {
    expect(readSettings(env)).toEqual({});
    writeSettings({}, env);
    writeFileSync(settingsFile(env), '{ not json');
    expect(readSettings(env)).toEqual({});
  });

  it('round-trips, merges a patch, and removes a key patched to undefined', () => {
    expect(writeSettings({ groupId: '123', mode: 'live', host: 'git.example.com' }, env)).toEqual({ groupId: '123', mode: 'live', host: 'git.example.com' });
    expect(writeSettings({ project: 'api', host: undefined }, env)).toEqual({ groupId: '123', mode: 'live', project: 'api' });
    expect(readSettings(env)).toEqual({ groupId: '123', mode: 'live', project: 'api' });
    expect(JSON.parse(readFileSync(settingsFile(env), 'utf8'))).toEqual({ groupId: '123', mode: 'live', project: 'api' });
    expect(readdirSync(path.join(dir, 'data'))).toEqual(['settings.json']); // the temp file was renamed, not left
  });

  it('drops unknown keys, wrong types, blanks, multi-line values and a mode that is not demo or live', () => {
    expect(cleanSettings({ groupId: 42, host: '  ', mode: 'replay', project: 'a\nb', proofAuthors: ' op ', extra: 'x' })).toEqual({ proofAuthors: 'op' });
    expect(cleanSettings({ mode: 'demo', groupId: '9' })).toEqual({ mode: 'demo', groupId: '9' });
    expect(cleanSettings([1])).toEqual({});
    writeSettings({}, env);
    writeFileSync(settingsFile(env), JSON.stringify({ groupId: '7', mode: 'LIVE', token: 'secret' }));
    expect(readSettings(env)).toEqual({ groupId: '7' });
  });

  it('lives in the data folder: AFTERLIFE_DATA_DIR, else BELAY_DATA_DIR, else .belay in the app root', () => {
    expect(dataDirOf({ AFTERLIFE_DATA_DIR: '/a', BELAY_DATA_DIR: '/b' })).toBe('/a');
    expect(dataDirOf({ BELAY_DATA_DIR: '/b' })).toBe('/b');
    expect(dataDirOf({ AFTERLIFE_DATA_DIR: '' })).toBe(path.join(process.cwd(), '.belay'));
  });
});
