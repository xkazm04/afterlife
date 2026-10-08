// A poll that cannot read belay-policy (here: a tier-state.yml the engine's parser rejects) leaves the class tiers as they
// were. That is recorded in poll_state on the group's policy source, and Ladder marks the tiers stale with the reason
// until a read succeeds. The demo GitLab on top of the seeded index.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO } from '@/lib/demo';
import { setDataSource } from '@/server/data';
import { replayClock } from '@/server/data/live/clock';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { listPollStates } from '@/server/index/repositories/pollState';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { LadderScreen } from '../LadderScreen';
import { loadLadderData } from './loadLadderData';

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

const db = await memoryIndex();
const gl = createDemoGitLab(SEED_NOW);
const policy = gl.state.projects.find((p) => p.raw.name === 'belay-policy');
const good = policy?.files['tier-state.yml'] ?? '';
const cfg = readPollerConfig(144060371, {});

async function pollAndLoad() {
  const cycle = await runPollCycle(gl.port, db, replayClock.poll(), { cfg });
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO, null);
  setDataSource(liveSource(() => snap));
  const data = loadLadderData();
  return { cycle, data, page: renderToString(createElement(ToastProvider, null, createElement(LadderScreen, data))) };
}

let failed: Awaited<ReturnType<typeof pollAndLoad>>;
beforeAll(async () => {
  await seedDemo(db);
  policy!.files['tier-state.yml'] = 'agents: [not, a, map'; // not YAML the engine accepts
  failed = await pollAndLoad();
}, 60_000);
afterAll(() => setDataSource(null));

describe('a failed belay-policy read', () => {
  it('is recorded on the policy source in poll_state, with the reason', async () => {
    const states = await listPollStates(db, 'policy:');
    expect(states).toHaveLength(1);
    expect(states[0]?.lastError).toMatch(/tier-state\.yml/);
  });

  it('Ladder marks the class tiers stale with the reason', () => {
    expect(failed.data.tiersStale?.reason).toMatch(/tier-state\.yml/);
    expect(failed.page).toContain('class tiers stale');
    expect(failed.page).toContain('tier-state.yml is not valid YAML');
  });

  it('until a read succeeds: then the mark is gone', async () => {
    policy!.files['tier-state.yml'] = good;
    const next = await pollAndLoad();
    expect((await listPollStates(db, 'policy:'))[0]?.lastError).toBeNull();
    expect(next.data.tiersStale).toBeNull();
    expect(next.page).not.toContain('class tiers stale');
  });
});
