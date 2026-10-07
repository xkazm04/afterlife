// A class whose record the poll counts as eligible gets one promotion ask in Needs you, counted on the badge, never
// duplicated by a second poll, and closed once its tier moves. Against the demo GitLab, with no mock between.
import { beforeEach, describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ACCOUNT, LEDGERLINE_GID } from '@/server/gitlab/fake/demo/ids';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { closeProposal } from '@/server/index/repositories/work/proposal';
import { getNeedsYou } from '@/server/index/views';
import { NOW, rig, type Rig } from '../../__tests__/helpers';

const DAY = 86_400_000;
const LATER = new Date(NOW.getTime() + 5 * 60_000);
const ID = 'promote:ledgerline:code-fix.patch';
let r: Rig;

const fileOf = (project: string, path: string): { files: Record<string, string> } => {
  const p = r.gl.state.projects.find((x) => x.raw.name === project);
  if (!p || !(path in p.files)) throw new Error(`no ${path} in ${project}`);
  return p;
};

/** tier-state.yml as a person or the tripwire would leave it: code-fix.patch at `tier` since `since`. */
function setTier(tier: string, since: Date): void {
  const p = fileOf('belay-policy', 'tier-state.yml');
  const text = p.files['tier-state.yml'] ?? '';
  p.files['tier-state.yml'] = text.replace(/code-fix\.patch: \{[^}]*\}/, `code-fix.patch: { tier: ${tier}, since: "${since.toISOString()}", by: "operator via promotion MR !40" }`);
  expect(p.files['tier-state.yml']).not.toBe(text);
}

/** Five merges of code-fix.patch by the patcher, appended to ledgerline's chain in belay-ledger. */
function mergeFive(): void {
  const path = `events/${LEDGERLINE_GID}.jsonl`;
  const p = fileOf('belay-ledger', path);
  const chain: LedgerEvent[] = (p.files[path] ?? '').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerEvent);
  for (let i = 0; i < 5; i++) {
    chain.push(append(chain, {
      at: new Date(NOW.getTime() - (5 - i) * DAY).toISOString(), agent: ACCOUNT.patcher, action_class: 'code-fix.patch', kind: 'merged',
      tier_at_time: 'assisted', subject: { project_id: LEDGERLINE_GID, type: 'mr', iid: 101 + i }, payload_ref: `proofs/${101 + i}/merged.json`, observed_by: 'poll',
    }));
  }
  p.files[path] = chain.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

const promotions = async (at: Date) => (await getNeedsYou(r.db, 'ledgerline', at)).filter((n) => n.kind === 'promote');

beforeEach(async () => {
  r = await rig();
  setTier('assisted', new Date(NOW.getTime() - 10 * DAY));
  mergeFive();
  const first = await r.poll();
  expect(first.projects.map((p) => p.error ?? null)).toEqual([null]);
}, 60_000);

describe('poll cycle: a promotion ask for an eligible class', () => {
  it('opens one, in the desk\'s form with each rule and its count, and the badge counts it', async () => {
    expect(await promotions(NOW)).toEqual([{
      id: ID, kind: 'promote', title: 'Promote T1 patcher · code-fix.patch', from: 'assisted', to: 'supervised',
      rules: [['accepted outputs', '5 / 5', true], ['reverts', '0', true]], does: expect.stringContaining('policy MR'),
    }]);
    const all = await getNeedsYou(r.db, 'ledgerline', NOW);
    expect(all.map((n) => n.id).sort()).toEqual([ID, 'readmit:ledgerline:patch-bump']);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(all.length);
  });

  it('a second poll does not duplicate it', async () => {
    await r.poll(LATER);
    expect((await promotions(LATER)).map((n) => n.id)).toEqual([ID]);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(2);
  });

  it('closes it once the tier moves, and the badge drops it', async () => {
    setTier('supervised', LATER);
    await r.poll(LATER);
    expect(await promotions(LATER)).toEqual([]);
    expect((await getProjectRow(r.db, 'ledgerline'))?.needsYou).toBe(1);
    const { rows } = await r.db.query<{ state: string }>('select state from proposal where id = $1', [ID]);
    expect(rows[0]?.state).toBe('expired');
  });

  it('is not opened again once a person acted on it, until the record moves', async () => {
    expect(await closeProposal(r.db, ID, 'acted', LATER, 'operator')).toBe(true);
    await r.poll(LATER);
    expect(await promotions(LATER)).toEqual([]);
  });

  it('a re-admit a person acted on is not opened again while the quarantine is the same one', async () => {
    expect(await closeProposal(r.db, 'readmit:ledgerline:patch-bump', 'acted', LATER, 'operator')).toBe(true);
    await r.poll(LATER);
    expect((await getNeedsYou(r.db, 'ledgerline', LATER)).map((n) => n.id)).toEqual([ID]);
  });
});
