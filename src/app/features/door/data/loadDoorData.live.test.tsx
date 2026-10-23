// Live mode over the seeded index (as seeded.test.ts): the Door lists only the group's own decisions, and the numbers on the screens agree. Demo keeps the five.
import type { PGlite } from '@electric-sql/pglite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO } from '@/lib/demo';
import { loadEstateData } from '@/app/features/cycles/data/loadEstateData';
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { loadFleetProject } from '@/app/features/fleet/data/loadFleetProject';
import { loadMonitorData } from '@/app/features/monitor/data/loadMonitorData';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { demoSource } from '@/server/data/demoSource';
import { replayClock } from '@/server/data/live/clock';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { rulesOf } from '@/server/data/policy';
import { getDataSource, setDataSource } from '@/server/data/select';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { DoorScreen } from '../DoorScreen';
import { loadDoorData } from './loadDoorData';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

let db: PGlite;
beforeAll(async () => {
  db = await memoryIndex();
  await seedDemo(db);
  const cycle = await runPollCycle(createDemoGitLab(SEED_NOW).port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  setDataSource(liveSource(() => snap));
}, 60_000);
afterAll(() => setDataSource(null));

const html = () => renderToString(createElement(ToastProvider, null, createElement(DoorScreen, { data: loadDoorData() })));

describe('Door, live over the seed', () => {
  it("the badge, the Door's row, the deep needs and /needs-you all say 0", () => {
    const view = loadNeedsYouView();
    expect([
      getDataSource().getNeedsYouCount(),
      loadDoorData().projects.find((p) => p.id === 'ledgerline')?.needsYou,
      loadDoorData().deep.needs.length,
      view.kind === 'live' ? view.items.length : 0,
    ]).toEqual([0, 0, 0, 0]);
  });

  it('door, fleet and monitor list the same decisions', () => {
    const ids = (needs: readonly { id: string }[]) => needs.map((n) => n.id);
    const needs = loadFleetProject(loadFleetData().deepId)!.view.depth.needs;
    expect(ids(needs.kind === 'decisions' ? needs.items : [])).toEqual(ids(loadDoorData().deep.needs));
    expect(ids(loadMonitorData().needs)).toEqual(ids(loadDoorData().deep.needs));
  });

  it('draws no seeded decision title', () => {
    const out = html();
    for (const n of DEMO.needsYou) expect(out).not.toContain(n.title.replaceAll("'", '&#x27;'));
  });

  it('prints no data label in either mode: the door is a picture, the app window says which data it shows', () => {
    expect(html()).not.toContain('stylised city');
    setDataSource(demoSource);
    expect(html()).not.toContain('illustrative demo data');
  });

  it("the door's cycles line counts what /cycles counts, live and demo", () => {
    const both = () => [loadDoorData().cycles, { projects: loadEstateData().inCycles, gained: loadEstateData().sum.net }];
    const [live, cycles] = both();
    expect(live).toEqual(cycles);
    setDataSource(demoSource);
    const [demo, demoCycles] = both();
    expect(demo).toEqual(demoCycles);
  });

  it('demo mode keeps all five decisions', () => {
    setDataSource(demoSource);
    setDataSource(demoSource);
    expect(loadDoorData().deep.needs).toHaveLength(5);
  });
});
