// The root layout's shell read is request-time: with Cache Components the build prerenders the static shell, and
// connection() is where that prerender stops. So nothing about the mode may be read before connection() resolves: a
// render begun under the build's environment (demo) that resumes for a request under live must say live.
import type { ReactElement } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readDataConfig, startRuntime } from '@/server/data';
import type { KnownShellInfo } from '../ShellContext';

let release: () => void = () => undefined;
vi.mock('next/server', () => ({ connection: vi.fn(() => new Promise<void>((r) => (release = r))) }));

const { ShellRead } = await import('./ShellRead');

const READY = Symbol.for('afterlife.liveRuntime.ready');
const holder = globalThis as unknown as Record<symbol, { scheduler?: { stop(): void } } | undefined>;
const reset = (): void => {
  holder[READY]?.scheduler?.stop();
  for (const k of ['starting', 'ready', 'failed']) delete holder[Symbol.for(`afterlife.liveRuntime.${k}`)];
};
const modeOf = async (el: Promise<ReactElement<{ info: KnownShellInfo }>>) => (await el).props.info.data;

beforeAll(async () => {
  reset();
  // The live runtime a `AFTERLIFE_MODE=live AFTERLIFE_GITLAB=fake` server starts in instrumentation.ts: the seeded fake group.
  await startRuntime(readDataConfig({ AFTERLIFE_MODE: 'live', AFTERLIFE_GITLAB: 'fake' }), () => undefined, () => undefined);
}, 60_000);
afterAll(reset);
afterEach(() => vi.unstubAllEnvs());

describe('ShellRead (the root layout shell read)', () => {
  it('reads the mode after connection(): begun under the build env (demo), resumed for a live request, it says live', async () => {
    vi.stubEnv('AFTERLIFE_MODE', 'demo'); // the environment `next build` ran with
    const pending = ShellRead();
    vi.stubEnv('AFTERLIFE_MODE', 'live'); // the running server's environment, when the request arrives
    vi.stubEnv('AFTERLIFE_GITLAB', 'fake');
    release();
    expect(await modeOf(pending)).toMatchObject({ mode: 'live', fakeGitlab: true });
  });

  it('and the other way round: a live build env never leaks into a demo request', async () => {
    vi.stubEnv('AFTERLIFE_MODE', 'live');
    const pending = ShellRead();
    vi.stubEnv('AFTERLIFE_MODE', 'demo');
    release();
    expect(await modeOf(pending)).toMatchObject({ mode: 'demo', poll: null });
  });

  it('reads nothing while connection() is pending (a prerender): the source is not touched', async () => {
    vi.stubEnv('AFTERLIFE_MODE', 'live');
    vi.stubEnv('AFTERLIFE_GITLAB', 'fake');
    reset(); // live with no runtime: any read would throw "first poll has not finished"
    const settled = vi.fn();
    const pending = ShellRead().then(settled, settled);
    await new Promise((r) => setTimeout(r, 20));
    expect(settled).not.toHaveBeenCalled();
    release();
    await pending;
    // the read threw "first poll has not finished": the shell says live with nothing read, never the error page's throw
    const el = settled.mock.calls[0]?.[0] as ReactElement<{ info: KnownShellInfo }>;
    expect(el.props.info).toMatchObject({ needsYouCount: null, data: { mode: 'live', group: 'first poll not finished' } });
  });
});
