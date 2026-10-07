// Live mode, fed by a poll of the demo GitLab on top of the seeded index (as parity.test.ts): no seeded Ladder or Needs-you
// item appears unlabelled. The Ladder still opens with the demo's belay-policy history and the seed's records, so each
// carries a demo mark; Needs you never draws the seeded desk, only the group's own items or its empty state.
import type { PGlite } from '@electric-sql/pglite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO } from '@/lib/demo';
import { loadLadderData } from '@/app/features/ladder/data/loadLadderData';
import { LEDGER_SEED } from '@/app/features/ladder/data/ledgerSeed';
import { LadderScreen } from '@/app/features/ladder/LadderScreen';
import { loadDoorData } from '@/app/features/door/data/loadDoorData';
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { loadNeedsYouView, SEEDED_ITEMS } from '@/app/features/needs-you/data/pick';
import NeedsYouPage from '@/app/needs-you/page';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { upsertProposals } from '@/server/index/repositories/work/proposal';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { demoSource } from '../demoSource';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { buildSnapshot, type LiveSnapshot } from '../live/snapshot';
import { rulesOf } from '../policy';
import { getDataSource, setDataSource } from '../select';

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

let db: PGlite;
let snap: () => Promise<LiveSnapshot>;
beforeAll(async () => {
  db = await memoryIndex();
  await seedDemo(db);
  const cycle = await runPollCycle(createDemoGitLab(SEED_NOW).port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  snap = () => buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  const first = await snap();
  setDataSource(liveSource(() => first));
}, 60_000);
afterAll(() => setDataSource(null));

const html = (el: Parameters<typeof renderToString>[0]) => renderToString(createElement(ToastProvider, null, el));
const count = (s: string, part: string) => s.split(part).length - 1;
/** The DemoChip's title, as renderToString escapes it. */
const chip = (what: string) => `title="${what.replaceAll("'", '&#x27;')}: live mode does not read this from GitLab yet"`;

describe('the Ladder, live', () => {
  const page = () => html(createElement(LadderScreen, loadLadderData()));

  it('every seeded ledger entry it draws carries a demo mark', () => {
    const out = page();
    const drawn = LEDGER_SEED.reduce((n, e) => n + count(out, e.text.replaceAll("'", '&#x27;')), 0);
    expect(drawn).toBeGreaterThan(0);
    expect(count(out, chip("The demo's own ledger"))).toBe(drawn);
  });

  it('the opening head and the policy revision carry a demo mark; the records do too', () => {
    const out = page();
    expect(count(out, chip('The tier-state.yml head'))).toBe(2); // the lozenge and the status bar
    expect(count(out, chip('The policy revision'))).toBe(1);
    expect(count(out, chip('The records (Acc, No-edit, Rv, Clean)'))).toBe(1);
    expect(out).toContain('title="No record yet · not scored"'); // tier.demote has none: it says so, never a zero
  });

  it('the same screen in demo mode marks nothing: there everything is the demo, and the app says so once', () => {
    setDataSource(demoSource);
    try {
      expect(page()).not.toContain('live mode does not read this from GitLab yet');
    } finally {
      setDataSource(null);
    }
  });
});

describe('Needs you, live', () => {
  const SEEDED_TITLES = DEMO.needsYou.map((n) => n.title);

  it('never draws the seeded desk: no seeded item, no !44 incident, no patch-bump record', async () => {
    const s = await snap();
    setDataSource(liveSource(() => s));
    const view = loadNeedsYouView();
    expect(view).toEqual({ kind: 'empty', seeded: 5 });
    const out = html(createElement(NeedsYouPage));
    for (const t of SEEDED_TITLES) expect(out).not.toContain(t);
    expect(out).not.toContain('!44');
    expect(out).not.toContain('patch-bump');
    expect(out).toContain('5 demo item(s) seeded into this index are not shown');
  });

  /** The four numbers the screens show: the badge, Fleet's ledgerline row, the Door's deep project, and the Needs-you list. */
  const counts = () => {
    const view = loadNeedsYouView();
    return [
      getDataSource().getNeedsYouCount(),
      loadFleetData().projects.find((p) => p.id === 'ledgerline')?.needsYou,
      loadDoorData().projects.find((p) => p.id === 'ledgerline')?.needsYou,
      view.kind === 'live' ? view.items.length : 0,
    ];
  };

  it('with only the seeded items, the badge, Fleet, the Door and the screen all say 0', async () => {
    const s = await snap();
    setDataSource(liveSource(() => s));
    expect(counts()).toEqual([0, 0, 0, 0]);
    expect(loadNeedsYouView()).toEqual({ kind: 'empty', seeded: 5 });
  });

  it('draws the group’s own open items, and still none of the seeded ones', async () => {
    await upsertProposals(db, [{
      id: 'readmit:ledgerline:qa.file-bug', projectId: 'ledgerline', kind: 'readmit', state: 'open', parentId: null,
      title: 'Re-admit T7 qa · qa.file-bug', subject: { reason: 'a revert on !52', does: 'Re-admits at Assisted at most, never at its old tier.' },
      dueAt: null, openedAt: SEED_NOW, actedAt: null, actedAs: null,
    }]);
    const s = await snap();
    setDataSource(liveSource(() => s));
    const view = loadNeedsYouView();
    expect(view.kind === 'live' && view.items.map((n) => n.id)).toEqual(['readmit:ledgerline:qa.file-bug']);
    expect(view.kind === 'live' && view.items.some((n) => SEEDED_ITEMS.has(n.id))).toBe(false);
    expect(counts()).toEqual([1, 1, 1, 1]);
    const out = html(createElement(NeedsYouPage));
    expect(out).toContain('Re-admit T7 qa · qa.file-bug');
    for (const t of SEEDED_TITLES) expect(out).not.toContain(t);
  });
});
