// Live mode over the seeded index (as seeded.test.ts): the Door lists only the group's own decisions, and the numbers on the screens agree. Demo keeps the five.
import type { PGlite } from '@electric-sql/pglite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO } from '@/lib/demo';
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

  it('draws no seeded decision title', () => {
    const out = html();
    for (const n of DEMO.needsYou) expect(out).not.toContain(n.title.replaceAll("'", '&#x27;'));
  });

  it('says what the status bar says, not "illustrative demo data"; demo still does', () => {
    const out = html();
    expect(out).not.toContain('illustrative demo data');
    expect(out).toContain('live data · acme-lab · some parts still demo, marked<!-- --> · stylised city'); // dataLabel's words
    setDataSource(demoSource);
    expect(html()).toContain('illustrative demo data<!-- --> · stylised city');
  });

  it('demo mode keeps all five decisions', () => {
    setDataSource(demoSource);
    setDataSource(demoSource);
    expect(loadDoorData().deep.needs).toHaveLength(5);
  });
});
