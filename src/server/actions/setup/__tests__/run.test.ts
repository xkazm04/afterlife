// The setup writes, preview then confirm, against a fake exec, launcher and restart: the exact commands per platform, the
// refusals, the settings diff, the env that wins, and the digest that turns a moved settings file into `changed`.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSettings, settingsFile, writeSettings } from '@/server/env/settings';
import type { SetupIntent } from '@/server/start/wire';
import { confirmSetupWrite, previewSetupWrite } from '../run';
import { setupRig, type SetupRig } from './rig';

async function run(rig: SetupRig, intent: SetupIntent) {
  const p = await previewSetupWrite(rig.deps, intent);
  if (p.status !== 'preview') throw new Error(`no preview: ${JSON.stringify(p)}`);
  return { preview: p.preview, result: await confirmSetupWrite(rig.deps, intent, p.preview.previewId) };
}

describe('install-glab', () => {
  const rig = setupRig('windows');
  it('previews and runs winget, as one argv, and only once for a repeated confirm', async () => {
    const { preview, result } = await run(rig, { kind: 'install-glab' });
    expect(preview.commands.map((c) => c.display)).toEqual(['winget install GLab.GLab --accept-source-agreements --accept-package-agreements']);
    expect([preview.mode, preview.risk]).toEqual(['live', 'low']);
    expect(result.status).toBe('done');
    expect(await confirmSetupWrite(rig.deps, { kind: 'install-glab' }, preview.previewId)).toBe(result);
    expect(rig.execs).toEqual([['winget', 'install', 'GLab.GLab', '--accept-source-agreements', '--accept-package-agreements']]);
  });

  it('is refused when glab already answers, or winget is not on the PATH; a failing installer is failed', async () => {
    rig.glab = { bin: 'glab', version: 'glab 1.120.0' };
    expect(await previewSetupWrite(rig.deps, { kind: 'install-glab' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/already installed \(glab 1\.120\.0\)/) });
    rig.glab = null;
    rig.path.clear();
    expect(await previewSetupWrite(rig.deps, { kind: 'install-glab' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/winget is not on/) });
    rig.path.add('winget');
    rig.exitCode = 1;
    expect((await run(rig, { kind: 'install-glab' })).result).toMatchObject({ status: 'failed', results: [{ ok: false, error: 'installer said no' }] });
  });

  it('refuses a confirm it never previewed', async () => {
    expect(await confirmSetupWrite(rig.deps, { kind: 'install-glab' }, 'f'.repeat(64))).toMatchObject({ status: 'refused', reason: expect.stringMatching(/stale/) });
    expect(rig.execs).toEqual([]);
  });
});

describe('install-glab elsewhere', () => {
  const mac = setupRig('macos');
  it('runs brew on macOS', async () => {
    await run(mac, { kind: 'install-glab' });
    expect(mac.execs).toEqual([['brew', 'install', 'glab']]);
  });
});

describe('install-glab on linux', () => {
  const linux = setupRig('linux');
  it('is refused, naming the install docs', async () => {
    expect(await previewSetupWrite(linux.deps, { kind: 'install-glab' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/gitlab\.com\/gitlab-org\/cli/) });
  });
});

describe('glab-login', () => {
  const rig = setupRig('windows');
  it('opens a new window running glab auth login with the host, and never execs anything', async () => {
    rig.glab = { bin: 'glab', version: 'glab 1.120.0' };
    const { preview, result } = await run(rig, { kind: 'glab-login', host: 'git.example.com' });
    expect(preview.commands[0]?.display).toBe('cmd /c start "glab login" cmd /k glab auth login --hostname git.example.com');
    expect(result).toMatchObject({ status: 'done', results: [{ ok: true, made: 'a terminal window opened' }] });
    expect(rig.launches).toEqual([['cmd', '/c', 'start', 'glab login', 'cmd', '/k', 'glab', 'auth', 'login', '--hostname', 'git.example.com']]);
    expect(rig.execs).toEqual([]);
  });

  it('is refused while glab is not installed', async () => {
    expect(await previewSetupWrite(rig.deps, { kind: 'glab-login' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/not installed/) });
  });
});

describe('glab-login on macOS and linux', () => {
  const mac = setupRig('macos');
  const linux = setupRig('linux');
  it('tells Terminal to do the script on macOS', async () => {
    mac.glab = { bin: '/opt/homebrew/bin/glab', version: 'glab 1' };
    await run(mac, { kind: 'glab-login' });
    expect(mac.launches[0]?.slice(0, 3)).toEqual(['osascript', '-e', 'tell application "Terminal" to do script "/opt/homebrew/bin/glab auth login"']);
  });

  it('uses x-terminal-emulator on linux, and refuses with the command to copy without one', async () => {
    linux.glab = { bin: 'glab', version: 'glab 1' };
    expect(await previewSetupWrite(linux.deps, { kind: 'glab-login' })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/run `glab auth login` in your own terminal/) });
    linux.path.add('x-terminal-emulator');
    await run(linux, { kind: 'glab-login' });
    expect(linux.launches).toEqual([['x-terminal-emulator', '-e', 'glab', 'auth', 'login']]);
  });
});

describe('set-setup', () => {
  const rig = setupRig('windows');
  const intent: SetupIntent = { kind: 'set-setup', groupId: '777', mode: 'live', project: 'api' };

  it('previews the settings diff, writes them, restarts the runtime and says its new state', async () => {
    writeSettings({ groupId: '1', proofAuthors: 'op' }, rig.deps.env);
    const { preview, result } = await run(rig, intent);
    expect(preview.diff).toEqual(['- groupId: 1', '+ groupId: 777', '- mode: (unset)', '+ mode: live', '- project: (unset)', '+ project: api']);
    expect(result).toMatchObject({ status: 'done', results: [{ ok: true }, { ok: true, made: 'live: first poll finished, 3 project(s)' }] });
    expect(readSettings(rig.deps.env)).toEqual({ groupId: '777', mode: 'live', project: 'api', proofAuthors: 'op' }); // left out: kept
    expect(JSON.parse(readFileSync(settingsFile(rig.deps.env), 'utf8')).groupId).toBe('777');
    expect(rig.restarts).toBe(1);
  });

  it('refuses a key the env sets to another value, and leaves one it sets to the same value to it', async () => {
    rig.deps.env = { ...rig.deps.env, AFTERLIFE_GROUP_ID: '42' };
    expect(await previewSetupWrite(rig.deps, intent)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/^AFTERLIFE_GROUP_ID .*is set .*"42".*the env wins/) });
    rig.deps.env = { ...rig.deps.env, AFTERLIFE_GROUP_ID: '777' };
    const p = await previewSetupWrite(rig.deps, intent);
    expect(p).toMatchObject({ status: 'preview', preview: { notes: expect.arrayContaining([expect.stringMatching(/groupId is already "777" in the environment/)]) } });
  });

  it('answers changed, and writes nothing, when the settings moved between the preview and the confirm', async () => {
    const p = await previewSetupWrite(rig.deps, intent);
    if (p.status !== 'preview') throw new Error('no preview');
    writeSettings({ groupId: '5' }, rig.deps.env);
    expect(await confirmSetupWrite(rig.deps, intent, p.preview.previewId)).toMatchObject({ status: 'changed' });
    expect([readSettings(rig.deps.env), rig.restarts]).toEqual([{ groupId: '5' }, 0]);
  });

  it('is failed when the restarted runtime did not start', async () => {
    rig.restartTo = { mode: 'live', ok: false, reason: 'glab is not logged in' };
    expect((await run(rig, intent)).result).toMatchObject({ status: 'failed', results: [{ ok: true }, { ok: false, error: 'live, but the start failed: glab is not logged in' }] });
  });
});
