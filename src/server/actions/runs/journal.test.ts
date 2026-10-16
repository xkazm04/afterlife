// A confirm's outcome is kept under its previewId (action_runs), so a confirm that got no answer can be asked about, and a
// repeat or a concurrent confirm of the same previewId never runs its commands twice. Live rig: the demo GitLab as the port.
import { describe, expect, it, vi } from 'vitest';
import { listCommands } from '@/server/index/repositories/commandsRun';
import { confirmIntent, previewIntent } from '../run';
import type { ActionResponse } from '../types';
import { mrOf } from '../words';
import { liveRig } from '../__tests__/rig';
import { claim, recallRun } from './journal';

const at = vi.hoisted(() => ({ headers: new Headers({ host: 'localhost:3000' }), deps: null as unknown }));
vi.mock('next/headers', () => ({ headers: async () => at.headers }));
vi.mock('../deps', () => ({ actionDeps: () => at.deps }));

const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

function idOf(r: ActionResponse): string {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview.previewId;
}

describe('the server recalls what a previewId ran', () => {
  it('a done confirm is recalled with its results, and the recall writes nothing', async () => {
    const { gl, deps } = await liveRig();
    const id = idOf(await previewIntent(deps, promote));
    const r = await confirmIntent(deps, promote, id);
    expect(r.status === 'done' && mrOf(r.results)).toBe('!1');
    const writes = gl.state.writes.length;
    const back = await recallRun(deps, id);
    expect(back).toMatchObject({ kind: 'ran', response: { status: 'done' } });
    expect(back.kind === 'ran' && back.response.status === 'done' && mrOf(back.response.results)).toBe('!1');
    expect(gl.state.writes).toHaveLength(writes);
  });

  it('a previewId that was previewed but never confirmed recalls as never, and nothing was written', async () => {
    const { gl, db, deps } = await liveRig();
    const id = idOf(await previewIntent(deps, promote));
    expect(await recallRun(deps, id)).toEqual({ kind: 'never' });
    expect(gl.state.writes).toHaveLength(0);
    expect(await listCommands(db)).toHaveLength(0);
  });

  it('a row left running by an earlier process (a crash mid-send) recalls as unknown, never as running', async () => {
    const { deps, db } = await liveRig();
    const id = idOf(await previewIntent(deps, promote));
    expect(await claim(db, id, deps.now(), 'an-earlier-process')).toBe(true);
    expect(await recallRun(deps, id)).toEqual({ kind: 'unknown' });
  });

  it('demo mode never runs anything, so it recalls never', async () => {
    const { deps } = await liveRig();
    expect(await recallRun({ ...deps, mode: 'demo', db: null }, 'a'.repeat(64))).toEqual({ kind: 'never' });
  });
});

describe('one previewId runs once', () => {
  it('the same confirm sent again after a done answers from the record: done, the first results, no new command', async () => {
    const { deps, db } = await liveRig();
    const id = idOf(await previewIntent(deps, promote));
    const first = await confirmIntent(deps, promote, id);
    const again = await confirmIntent(deps, promote, id);
    expect(again).toMatchObject({ status: 'done' });
    expect(again.status === 'done' && first.status === 'done' && again.results).toEqual(first.status === 'done' && first.results);
    expect(await listCommands(db)).toHaveLength(2);
  });

  it('two confirms of one previewId in parallel execute its commands once', async () => {
    const { gl, deps, db } = await liveRig();
    const id = idOf(await previewIntent(deps, promote));
    const [a, b] = await Promise.all([confirmIntent(deps, promote, id), confirmIntent(deps, promote, id)]);
    expect(gl.state.writes).toHaveLength(2);
    expect(await listCommands(db)).toHaveLength(2);
    const other = a.status === 'done' && b.status === 'done' ? b : [a, b].find((x) => x.status !== 'done');
    expect([a, b].some((x) => x.status === 'done')).toBe(true);
    if (other?.status === 'refused') expect(other.reason).toMatch(/still running/);
    else expect(other).toMatchObject({ status: 'done' });
  });
});

describe('recallAction, the endpoint', () => {
  it('answers a local caller from the record, and an away one with unknown', async () => {
    const { recallAction } = await import('./recallAction');
    const { deps } = await liveRig();
    at.deps = deps;
    vi.stubEnv('BELAY_MODE', 'live');
    const id = idOf(await previewIntent(deps, promote));
    await confirmIntent(deps, promote, id);
    expect(await recallAction(id)).toMatchObject({ kind: 'ran', response: { status: 'done' } });
    expect(await recallAction(42)).toEqual({ kind: 'never' }); // no previewId is a number: nothing ran under it
    at.headers = new Headers({ host: 'evil.example:3000', origin: 'http://evil.example:3000' });
    expect(await recallAction(id)).toEqual({ kind: 'unknown' });
    vi.unstubAllEnvs();
  });
});
