// useStart over a mocked NDJSON stream, mounted with react-dom/client on the small fake DOM (no jsdom here): a node
// lights on its own event before `done` arrives, a refused line is the error state, and Re-check aborts the stream before.
import { describe, expect, it, vi } from 'vitest';
import { installFakeDom } from '@/components/shell/frame/fakeDom';
import { LIVE } from '../../model/fixtures/input';
import { SAVED } from '../../model/fixtures/saved';
import type { StartView } from '../../model/view';

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/start' }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

const { container } = installFakeDom();
const { act, createElement, useEffect } = await import('react');
const { createRoot } = await import('react-dom/client');
const { useStart } = await import('../useStart');

/** A probe response whose lines the test sends one by one. */
function stream() {
  let c!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (x) => void (c = x) });
  const enc = new TextEncoder();
  return { body, send: (o: unknown) => c.enqueue(enc.encode(`${JSON.stringify(o)}\n`)) };
}
const runs: { url: string; signal: AbortSignal; send: (o: unknown) => void }[] = [];
vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
  const s = stream();
  runs.push({ url, signal: init.signal!, send: s.send });
  return Promise.resolve(new Response(s.body, { status: 200 }));
});

const got: { view: StartView | null } = { view: null };
function Probe({ project }: { project?: typeof SAVED }) {
  const v = useStart({ facts: LIVE, repos: [], local: true, project });
  useEffect(() => {
    got.view = v;
  });
  return null;
}
const view = () => got.view!;
const step = (k: string) => view().steps.find((s) => s.key === k)!;
const tick = () => new Promise((r) => setTimeout(r, 0));
const send = async (o: unknown, run = runs.at(-1)!) => act(async () => (run.send(o), await tick(), await tick()));
const pass = (line: string) => ({ state: 'pass', line });

describe('useStart over the probe stream', () => {
  it('lights a node on its own event before done, and settles on done', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Probe)));
    expect(runs).toHaveLength(1);
    expect(runs[0]!.url).toBe('/api/start/probe');
    expect(view().running).toBe(true);
    expect([step('glab').state, step('login').state]).toEqual(['checking', 'checking']);

    await send({ t: 'stage', stage: 'preflight' });
    await send({ t: 'node', key: 'glab', read: pass('glab starts and answers') });
    expect([step('glab').state, step('login').state]).toEqual(['done', 'checking']);
    expect(view().running).toBe(true);

    const nodes = { glab: pass('g'), login: pass('signed in as @ops'), group: pass('acme · 12 projects'), live: pass('first poll finished'), doctor: pass('d'), setup: pass('s') };
    await send({ t: 'done', read: { at: '14:22:05', nodes, caps: [], source: 'glab' } });
    expect(view().running).toBe(false);
    expect(view().at).toBe('14:22:05');
    expect(step('login')).toMatchObject({ state: 'done', line: 'signed in as @ops' });
    await act(async () => root.unmount());
  });

  it('a refused line is the error state: the reason, and nothing checking any more', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Probe)));
    await send({ t: 'refused', reason: 'not this machine: the probe runs only on localhost' });
    expect(view().refused).toBe('not this machine: the probe runs only on localhost');
    expect(view().running).toBe(false);
    expect(step('glab').state).toBe('todo');
    await act(async () => root.unmount());
  });

  it('Re-check aborts the stream before it, and a late line from the old one changes nothing', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Probe)));
    const first = runs.at(-1)!;
    await act(async () => view().recheck());
    const second = runs.at(-1)!;
    expect(second).not.toBe(first);
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    await send({ t: 'node', key: 'glab', read: { state: 'fail', line: 'old stream' } }, first);
    expect(step('glab').state).toBe('checking');
    await send({ t: 'node', key: 'glab', read: pass('new stream') }, second);
    expect(step('glab')).toMatchObject({ state: 'done', line: 'new stream' });
    await act(async () => root.unmount());
  });

  it('a saved project: its root is derived on mount and nothing is proposed; its lines and save read from its file', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    const before = runs.length;
    await act(async () => root.render(createElement(Probe, { project: SAVED })));
    expect(runs.slice(before).map((r) => r.url).sort()).toEqual(['/api/start/derive', '/api/start/probe']);
    expect(view().project).toEqual({ slug: 'acme-api', name: 'Acme API', root: SAVED.root, savedAt: '2026-10-21' });
    expect(view().repo.picked).toBe(SAVED.root);
    expect(step('stack')).toMatchObject({ state: 'done', line: '3 of 3 lines confirmed when it was saved, 2026-10-21' });
    expect(step('save')).toMatchObject({ state: 'done', line: 'saved as acme-api on 2026-10-21: Vitals collects from it' });
    await act(async () => root.unmount());
  });
});
