// Live, the Ladder's record columns are the poll's own counts for a class one agent holds: no demo mark on them. A record
// the poll did not count (a class several agents hold, or none, which keeps the record the index held) still says it is
// not the poll's. The demo GitLab on top of the seeded index, with qa.file-bug held by a second agent in tier-state.yml.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO } from '@/lib/demo';
import { setDataSource } from '@/server/data';
import { HUMAN_KEY } from '@/lib/promotion';
import { replayClock } from '@/server/data/live/clock';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { rulesOf } from '@/server/data/policy';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { PromotionRule } from '../components/inspector/sections/PromotionRule';
import { LadderScreen } from '../LadderScreen';
import { loadLadderData } from './loadLadderData';

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

const NOT_COUNTED = '>not counted<';
let page = '';
let data: ReturnType<typeof loadLadderData>;
beforeAll(async () => {
  const db = await memoryIndex();
  await seedDemo(db);
  const gl = createDemoGitLab(SEED_NOW);
  const policy = gl.state.projects.find((p) => p.raw.name === 'belay-policy');
  const text = policy?.files['tier-state.yml'] ?? '';
  // a second agent holds qa.file-bug too: a split class, whose record the poll does not count
  policy!.files['tier-state.yml'] = text.replace(/^( +ai-patcher-acme-lab:\n)/m, '$1    qa.file-bug: { tier: assisted, since: "2026-10-01", by: "start tier + record" }\n');
  expect(policy!.files['tier-state.yml']).not.toBe(text);
  const cycle = await runPollCycle(gl.port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  expect(cycle.projects.map((p) => p.error ?? null)).toEqual([null]);
  expect(cycle.policy).toBeTruthy();
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  setDataSource(liveSource(() => snap));
  data = loadLadderData();
  page = renderToString(createElement(ToastProvider, null, createElement(LadderScreen, data)));
}, 60_000);
afterAll(() => setDataSource(null));

/** The rendered table row of one class. */
const rowOf = (id: string): string => {
  const start = page.indexOf(`id="row-${id.replace(/[^\w-]/g, '_')}"`);
  expect(start).toBeGreaterThan(-1);
  const next = page.indexOf('id="row-', start + 1);
  return page.slice(start, next === -1 ? undefined : next);
};

describe('Ladder, live: which record is the poll\'s', () => {
  it('a counted record carries no demo mark, and the record columns none either', () => {
    expect(data.seed.classes.find((c) => c.id === 'dep-bump.patch')).toMatchObject({ record: { accepted: 1 } });
    expect(data.seed.classes.find((c) => c.id === 'dep-bump.patch')).not.toHaveProperty('uncounted');
    expect(page).not.toContain('The records (Acc, No-edit, Rv, Clean)');
    expect(rowOf('dep-bump.patch')).not.toContain('>demo<');
    expect(rowOf('dep-bump.patch')).not.toContain(NOT_COUNTED);
  });

  it('a record the poll did not count (a split class) still says it is not the poll\'s', () => {
    // the index keeps the record it held: on the demo GitLab, the seed's
    expect(data.seed.classes.find((c) => c.id === 'qa.file-bug')).toMatchObject({ record: { accepted: 16 }, uncounted: true });
    expect(rowOf('qa.file-bug')).toContain(NOT_COUNTED);
    expect(page.split(NOT_COUNTED)).toHaveLength(2); // that row only
  });

  it('the inspector\'s rule marks the counts it reads only when they are not the poll\'s', () => {
    const rule = (uncounted: boolean) =>
      renderToString(createElement(PromotionRule, { promotion: { kind: 'notyet', next: 'hands_off', rules: [], precondition: HUMAN_KEY }, uncounted, sections: { isOpen: () => true, setOpen: () => undefined } }));
    expect(rule(true)).toContain(NOT_COUNTED);
    expect(rule(false)).not.toContain(NOT_COUNTED);
    expect(rule(false)).not.toContain('>demo<');
  });
});
