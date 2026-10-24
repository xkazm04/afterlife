// The palette's projects, read apart from the shell: [] and 'loading' until the first answer (never an empty fleet), one
// read at a time, a failed first read says so, a failed later read keeps the list, and regained focus re-reads at most
// once a minute and only a list the palette has read before.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOCUS_REREAD_MS, PROJECTS_URL, focusDue, loadProjects, projectsState, resetProjects } from './projects';

const P = [
  { id: 'ledgerline', name: 'ledgerline', group: 'core-banking', state: 'watching' },
  { id: 'paygate', name: 'paygate', group: 'payments', state: 'healthy' },
];
const answer = (body: unknown, status = 200) => vi.fn(() => Promise.resolve(Response.json(body, { status })));

beforeEach(() => resetProjects());
afterEach(() => vi.unstubAllGlobals());

describe('the palette projects store', () => {
  it('before any read: no projects, loading (the palette says "Loading projects...", never "no projects")', () => {
    expect(projectsState()).toEqual({ status: 'loading', projects: [], readAt: null, inFlight: false });
  });

  it('reads GET /api/shell/projects once, uncached, and keeps the list', async () => {
    const fetch = answer({ projects: P });
    vi.stubGlobal('fetch', fetch);
    const first = loadProjects(1000);
    void loadProjects(1000); // in flight: no second request
    await first;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([PROJECTS_URL, { cache: 'no-store' }]);
    expect(projectsState()).toMatchObject({ status: 'ready', projects: P });
  });

  it('a failed first read says failed; a failed later read keeps the last list', async () => {
    vi.stubGlobal('fetch', answer({ error: 'first poll has not finished' }, 503));
    await loadProjects(0);
    expect(projectsState()).toMatchObject({ status: 'failed', projects: [] });
    vi.stubGlobal('fetch', answer({ projects: P }));
    await loadProjects(1);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    await loadProjects(2);
    expect(projectsState()).toMatchObject({ status: 'ready', projects: P });
  });

  it('a bad body is no list', async () => {
    vi.stubGlobal('fetch', answer({ projects: [{ id: 1 }] }));
    await loadProjects(0);
    expect(projectsState()).toMatchObject({ status: 'failed', projects: [] });
  });

  it('regained focus: never before the first open, then at most once a minute', async () => {
    expect(focusDue(10 * FOCUS_REREAD_MS)).toBe(false);
    vi.stubGlobal('fetch', answer({ projects: P }));
    await loadProjects(5000);
    expect(focusDue(5000 + FOCUS_REREAD_MS - 1)).toBe(false);
    expect(focusDue(5000 + FOCUS_REREAD_MS)).toBe(true);
  });
});

describe('the palette (source guard: no DOM here)', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/palette/CommandPalette.tsx'), 'utf8');
  it('reads its projects itself and shows a loading row until they land', () => {
    expect(src).toContain('usePaletteProjects(open)');
    expect(src).toContain('Loading projects...');
  });
  it('navigates in a transition', () => {
    expect(src).toContain('startTransition(() => router.push(');
  });
});
