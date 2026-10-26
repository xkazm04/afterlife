import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isValidElement } from 'react';
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

const HOST_SHELLS = [
  ['fleet/[project]', () => import('./(app)/fleet/[project]/page')],
  ['vitals/[project]', () => import('./(app)/vitals/[project]/page')],
  ['ladder/[class]', () => import('./(app)/ladder/[class]/page')],
  ['maturity/[stage]', () => import('./(app)/maturity/[stage]/page')],
  ['needs-you/[item]', () => import('./(app)/needs-you/[item]/page')],
  ['task/[id]', () => import('./(app)/task/[id]/page')],
  ['setup/[node]', () => import('./(app)/setup/[node]/page')],
] as const;

describe('dynamic route pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.notFound.mockImplementation(() => {
      throw NOT_FOUND;
    });
  });

  // Every [param] screen is drawn by the screen host: its page is a static shell, and the id's branch (an unknown id is
  // notFound, fleet's ?project= redirects only to a project that exists) is the stream's, pinned in each module's
  // screen/slices.test.ts or screen/host.test.tsx.
  it.each(HOST_SHELLS)('%s is a static shell that reads nothing', async (_name, load) => {
    const page = (await load()).default as () => unknown;
    // only the empty request-time marker a title naming the id needs (features/screens/paramPage.tsx)
    expect(isValidElement(page())).toBe(true);
    expect(loaders.tasks).not.toHaveBeenCalled();
    expect(loaders.fleetProject).not.toHaveBeenCalled();
    expect(loaders.vitalsProject).not.toHaveBeenCalled();
    expect(loaders.ladderClass).not.toHaveBeenCalled();
    expect(loaders.maturityStage).not.toHaveBeenCalled();
    expect(loaders.needsItem).not.toHaveBeenCalled();
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  // HOST_SHELLS is typed by hand, so it is held to the [param] folders on disk: a new dynamic route without a branch test (or
  // without its own not-found page) fails here instead of going unseen.
  it('covers every dynamic route folder on disk, each with its own not-found page', () => {
    const covered = HOST_SHELLS.map((r) => r[0]).sort();
    const onDisk = dynamicRoutes(import.meta.dirname);
    expect(onDisk.map(urlOf).sort()).toEqual(covered);
    for (const r of onDisk) expect(existsSync(path.join(import.meta.dirname, r, 'not-found.tsx')), r).toBe(true);
  });

  // One rule for a title that names the param (Next 16, Cache Components: "runtime data in generateMetadata()" on an
  // otherwise static page): every [param] page takes paramTitle and ParamShell from features/screens/paramPage.tsx.
  it('every dynamic page uses the one param-page pattern', async () => {
    for (const r of dynamicRoutes(import.meta.dirname)) {
      const src = readFileSync(path.join(import.meta.dirname, r, 'page.tsx'), 'utf8');
      expect(src, r).toContain("from '@/app/features/screens/paramPage'");
      expect(src, r).toMatch(/export const generateMetadata = paramTitle\(/);
      expect(src, r).not.toMatch(/connection\(|<Suspense/);
    }
    const { paramTitle } = await import('./features/screens/paramPage');
    expect(await paramTitle('Afterlife · Fleet', 'project')({ params: Promise.resolve({ project: 'p1' }) })).toEqual({ title: 'Afterlife · Fleet · p1' });
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
