// A write settles only the inbox item of the project it acted on: an intent naming another project's proposal (a stale
// or buggy screen) still runs its write, and leaves that item open, so another project's Needs-you count stays true.
import { describe, expect, it } from 'vitest';
import { listOpenProposals, upsertProposals, type ProposalRow } from '@/server/index/repositories/work/proposal';
import { SEED_NOW } from '@/server/index/seed';
import { confirmIntent, previewIntent } from '../../run';
import { liveRig } from '../rig';

const item = (id: string, projectId: string): ProposalRow => ({
  id, projectId, kind: 'promotion', state: 'open', parentId: null, title: 'Promote', subject: {}, dueAt: null, openedAt: SEED_NOW, actedAt: null, actedAs: null,
});
const revoke = (proposal: string) => ({ kind: 'revoke-class', project: 'ledgerline', proposal, changes: [{ class: 'dep-bump.patch', to: 'supervised' }] });

async function confirmed(proposal: string) {
  const r = await liveRig();
  const other = (await r.db.query<{ id: string }>(`select id from project where id <> 'ledgerline' order by id limit 1`)).rows[0]!.id;
  await upsertProposals(r.db, [item('scope:mine', 'ledgerline'), item('scope:theirs', other)]);
  const p = await previewIntent(r.deps, revoke(proposal));
  if (p.status !== 'preview') throw new Error(p.status);
  expect((await confirmIntent(r.deps, revoke(proposal), p.preview.previewId)).status).toBe('done');
  return { ...r, other };
}

describe('the inbox item a confirm settles', () => {
  it('is never another project\'s', async () => {
    const { db, other } = await confirmed('scope:theirs');
    expect((await listOpenProposals(db, other)).map((x) => x.id)).toEqual(['scope:theirs']);
  });

  it('is the acted project\'s own', async () => {
    const { db } = await confirmed('scope:mine');
    expect((await listOpenProposals(db, 'ledgerline')).map((x) => x.id)).not.toContain('scope:mine');
  });
});
