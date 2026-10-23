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
  setupNode: vi.fn(),
  tasks: vi.fn(),
  fleetData: vi.fn(),
}));

vi.mock('next/navigation', () => nav);
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
vi.mock('./features/setup/data/loadSetupNode', () => ({ loadSetupNode: loaders.setupNode }));
vi.mock('./features/setup/SetupNodeScreen', () => ({ SetupNodeScreen: () => null }));
vi.mock('./features/task/TaskScreen', () => ({ TaskScreen: () => null }));
vi.mock('./features/task/model/build/loadPage', () => ({ loadPageFacts: () => ({}) }));
vi.mock('./features/task/model/build/loadTasks', () => ({ loadTasks: loaders.tasks }));
vi.mock('./features/task/model/verdict/reasons', () => ({ selectionFromQuery: () => ({}) }));

const ROUTES = [
  ['fleet/[project]', () => import('./fleet/[project]/page'), { project: 'p1' }, loaders.fleetProject, { id: 'p1' }],
  ['ladder/[class]', () => import('./ladder/[class]/page'), { class: 'c1' }, loaders.ladderClass, { id: 'c1' }],
  ['maturity/[stage]', () => import('./maturity/[stage]/page'), { stage: 's1' }, loaders.maturityStage, { key: 's1' }],
  ['needs-you/[item]', () => import('./needs-you/[item]/page'), { item: 'i1' }, loaders.needsItem, { demo: null, id: 'i1' }],
  ['setup/[node]', () => import('./setup/[node]/page'), { node: 'n1' }, loaders.setupNode, { id: 'n1' }],
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

  it('task/[id] renders a held task and calls notFound for an unknown one', async () => {
    const page = (await import('./task/[id]/page')).default;
    loaders.tasks.mockReturnValue([{ id: 't1' }]);
    const props = (id: string) => ({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });
    await expect(page(props('t1'))).resolves.toBeTruthy();
    expect(nav.notFound).not.toHaveBeenCalled();
    await expect(page(props('nope'))).rejects.toBe(NOT_FOUND);
  });

  it('fleet ?project= redirects only to a project that exists', async () => {
    const page = (await import('./fleet/page')).default;
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
});
