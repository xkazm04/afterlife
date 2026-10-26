import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The route-level branches of the dynamic pages: a known id renders its screen, an unknown one calls notFound, the fleet
// ?project= link redirects only to a project that exists. Loaders and screens are mocked, so this pins the page's own branch.
const NOT_FOUND = new Error('NEXT_NOT_FOUND');
const nav = vi.hoisted(() => ({ notFound: vi.fn(), redirect: vi.fn() }));
const loaders = vi.hoisted(() => ({
  fleetProject: vi.fn(),
  ladderClass: vi.fn(),
  maturityStage: vi.fn(),
  needsItem: vi.fn(),
  tasks: vi.fn(),
  fleetData: vi.fn(),
  vitalsProject: vi.fn(),
}));

vi.mock('next/navigation', () => nav);
// No request scope outside Next: the page's connection() (request time, never the build) resolves at once here.
vi.mock('next/server', async (orig) => ({ ...(await orig<object>()), connection: () => Promise.resolve() }));
vi.mock('./features/fleet/components/detail/ProjectDetail', () => ({ ProjectDetail: () => null }));
vi.mock('./features/fleet/data/loadFleetProject', () => ({ loadFleetProject: loaders.fleetProject }));
vi.mock('./features/fleet/data/loadFleetData', () => ({ loadFleetData: loaders.fleetData }));
vi.mock('./features/fleet/data/loadFleetSource', () => ({ loadFleetSource: () => ({}) }));
vi.mock('./features/fleet/data/loadFleetEstate', () => ({ loadFleetEstate: () => ({}) }));
vi.mock('./features/fleet/FleetScreen', () => ({ FleetScreen: () => null }));
vi.mock('@/server/runs/readDesk', () => ({ readDesk: () => ({}) }));
vi.mock('./features/ladder/ClassScreen', () => ({ ClassScreen: () => null }));
vi.mock('./features/ladder/data/loadLadderClass', () => ({ loadLadderClass: loaders.ladderClass, loadHumanKey: async () => null }));
vi.mock('./features/maturity/data/loadMaturityStage', () => ({ loadMaturityStage: loaders.maturityStage }));
vi.mock('./features/maturity/StageScreen', () => ({ StageScreen: () => null }));
vi.mock('./features/needs-you/components/detail/NeedsItemPage', () => ({ NeedsItemPage: () => null }));
vi.mock('./features/needs-you/data/pick', () => ({ loadNeedsItem: loaders.needsItem }));
vi.mock('./features/task/TaskScreen', () => ({ TaskScreen: () => null }));
vi.mock('./features/task/model/build/loadPage', () => ({ loadPageFacts: () => ({}) }));
vi.mock('./features/task/model/build/loadTasks', () => ({ loadTasks: loaders.tasks }));
vi.mock('./features/task/model/verdict/reasons', () => ({ selectionFromQuery: () => ({}) }));
vi.mock('./features/vitals/data/loadVitals', () => ({ loadVitalsProject: loaders.vitalsProject }));
vi.mock('./features/vitals/VitalsScreen', () => ({ VitalsScreen: () => null }));

const ROUTES = [
  ['fleet/[project]', () => import('./(app)/fleet/[project]/page'), { project: 'p1' }, loaders.fleetProject, { id: 'p1' }],
  ['ladder/[class]', () => import('./(app)/ladder/[class]/page'), { class: 'c1' }, loaders.ladderClass, { id: 'c1' }],
  ['maturity/[stage]', () => import('./(app)/maturity/[stage]/page'), { stage: 's1' }, loaders.maturityStage, { key: 's1' }],
  ['needs-you/[item]', () => import('./(app)/needs-you/[item]/page'), { item: 'i1' }, loaders.needsItem, { demo: null, id: 'i1' }],
  ['vitals/[project]', () => import('./(app)/vitals/[project]/page'), { project: 'grinex-portal' }, loaders.vitalsProject, { slug: 'grinex-portal' }],
] as const;

describe('dynamic route pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.notFound.mockImplementation(() => {
      throw NOT_FOUND;
    });
  });

  it.each(ROUTES)('%s renders a known id and calls notFound for an unknown one', async (_name, load, params, loader, found) => {
    const page = (await load()).default as (p: { params: Promise<typeof params> }) => Promise<unknown>;
    loader.mockReturnValue(found);
    await expect(page({ params: Promise.resolve(params) })).resolves.toBeTruthy();
    expect(nav.notFound).not.toHaveBeenCalled();
    loader.mockReturnValue(null);
    await expect(page({ params: Promise.resolve(params) })).rejects.toBe(NOT_FOUND);
  });

  it('task/[id] is a static shell: the screen host draws the task, and an unknown id is the stream notFound (task/screen/slices.test.ts)', async () => {
    const page = (await import('./(app)/task/[id]/page')).default as () => unknown;
    expect(page()).toBeNull();
    expect(loaders.tasks).not.toHaveBeenCalled();
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  it('fleet ?project= redirects only to a project that exists', async () => {
    // the page is a <Suspense> around FleetList, its request-time half: the branch is FleetList's
    const page = (await import('./(app)/fleet/FleetList')).FleetList;
    nav.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    loaders.fleetData.mockReturnValue({ projects: [{ id: 'a b' }] });
    await expect(page({ searchParams: Promise.resolve({ project: 'a b' }) })).rejects.toThrow('NEXT_REDIRECT');
    expect(nav.redirect).toHaveBeenCalledWith('/fleet/a%20b');
    nav.redirect.mockClear();
    await expect(page({ searchParams: Promise.resolve({ project: 'ghost' }) })).resolves.toBeTruthy();
    await expect(page({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
    expect(nav.redirect).not.toHaveBeenCalled();
  });

  // Setup's node page is a static shell (its title reads the param, marked as request data); an unknown node is the stream's
  // notFound, pinned in setup/screen/host.test.tsx.
  it('setup/[node] is a static shell that reads nothing', async () => {
    const page = (await import('./(app)/setup/[node]/page')).default as () => unknown;
    expect(page()).toBeTruthy();
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  // ROUTES is typed by hand, so it is held to the [param] folders on disk: a new dynamic route without a branch test (or
  // without its own not-found page) fails here instead of going unseen.
  it('covers every dynamic route folder on disk, each with its own not-found page', () => {
    const covered = [...ROUTES.map((r) => r[0]), 'task/[id]', 'setup/[node]'].sort();
    const onDisk = dynamicRoutes(import.meta.dirname);
    expect(onDisk.map(urlOf).sort()).toEqual(covered);
    for (const r of onDisk) expect(existsSync(path.join(import.meta.dirname, r, 'not-found.tsx')), r).toBe(true);
  });
});

/** A route folder's path without its route groups (`(app)/fleet/[project]` is `fleet/[project]`): groups are not in the URL. */
const urlOf = (rel: string) => rel.split('/').filter((s) => !s.startsWith('(')).join('/');

/** The route folders named `[param]` under src/app (features and api hold no pages), as posix paths from src/app. */
function dynamicRoutes(dir: string, rel = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory() || e.name === 'features' || e.name === 'api') return [];
    const next = path.posix.join(rel, e.name);
    return [...(e.name.startsWith('[') ? [next] : []), ...dynamicRoutes(path.join(dir, e.name), next)];
  }).sort();
}
