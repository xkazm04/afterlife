import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEMO, LEDGERLINE_ID } from '@/lib/demo';
import {
  getActionClasses, getFleet, getMaturity, getNeedsYou, getNeedsYouCount, getTask, getTasks,
} from '../views';
import { upsertProjects } from '../repositories';
import { SEED_NOW, seedDemo } from '../seed';
import { memoryIndex } from './memoryIndex';

let db: PGlite;
beforeAll(async () => {
  db = await memoryIndex();
  await seedDemo(db);
}, 60_000);

describe('seed -> views reproduces the demo shapes', () => {
  it('fleet: all 184 projects, groups, classes, tier counts, rungs and feed ages', async () => {
    const fleet = await getFleet(db, SEED_NOW);
    // The fixture spells "no last event" as null on six projects and by omission on the rest; the view omits it.
    const expected = { ...DEMO.fleet, projects: DEMO.fleet.projects.map((p) => ({ ...p, last: p.last ?? undefined })) };
    expect(fleet.projects).toHaveLength(184);
    expect(fleet.classes).toEqual(expected.classes);
    expect(fleet.groups).toEqual(expected.groups);
    expect(fleet.projects).toEqual(expected.projects);
  });

  it('fleet: unknown stays null, never zero or absent', async () => {
    const { projects } = await getFleet(db, SEED_NOW);
    const legacy = projects.find((p) => p.id === 'legacy-batch');
    expect(legacy?.proofs7d).toBeNull();
    expect(legacy?.demotions7d).toBeNull();
    expect(legacy?.stages).toEqual(Array(9).fill(null));
    expect(legacy?.feed).toEqual({ ageSec: null, ok: null });
    const stale = projects.find((p) => p.id === 'docs-portal');
    expect(stale?.feed).toMatchObject({ ageSec: 2820, ok: false });
    expect(stale?.feed.error).toMatch(/token expired/);
  });

  it('fleet: feed age moves with the clock the view is given', async () => {
    const later = new Date(SEED_NOW.getTime() + 60_000);
    const p = (await getFleet(db, later)).projects.find((x) => x.id === LEDGERLINE_ID);
    expect(p?.feed.ageSec).toBe(72);
  });

  it('needs-you: five items in order, with a live countdown and the picked-gap count', async () => {
    expect(await getNeedsYou(db, LEDGERLINE_ID, SEED_NOW)).toEqual(DEMO.needsYou);
    expect(await getNeedsYouCount(db, LEDGERLINE_ID)).toBe(DEMO.needsYou.length);
    const later = new Date(SEED_NOW.getTime() + 12 * 60_000);
    expect((await getNeedsYou(db, LEDGERLINE_ID, later)).find((i) => i.kind === 'signoff')?.dueIn).toBe('19 h 0 m');
    expect(await getNeedsYou(db, 'fx-rates')).toEqual([]);
  });

  it('action classes: tier, ceiling, lease, record and last move', async () => {
    expect(await getActionClasses(db, LEDGERLINE_ID, SEED_NOW)).toEqual(DEMO.actionClasses);
    const later = new Date(SEED_NOW.getTime() + 2 * 86_400_000);
    const dep = (await getActionClasses(db, LEDGERLINE_ID, later)).find((c) => c.id === 'dep-bump.patch');
    expect(dep).toMatchObject({ lease_days: 7, lastMove: 'promoted 7 d ago' });
  });

  it('action classes: a project with only tiers has no record and says its history is unknown', async () => {
    const rows = await getActionClasses(db, 'fx-rates', SEED_NOW);
    expect(rows).toHaveLength(12);
    for (const r of rows) {
      expect(r.record).toBeNull();
      expect(r.lease_days).toBeNull();
      expect(r.lastMove).toBe('unknown');
    }
  });

  it('maturity: rungs, evidence and gap proposals; unscanned projects return null', async () => {
    expect(await getMaturity(db, LEDGERLINE_ID)).toEqual(DEMO.maturity);
    expect(await getMaturity(db, 'fx-rates')).toBeNull();
  });

  it('tasks: every task with its proof, and a single lookup', async () => {
    expect(await getTasks(db, LEDGERLINE_ID, SEED_NOW)).toEqual(DEMO.tasks);
    expect(await getTask(db, '01J8Q4', SEED_NOW)).toEqual(DEMO.tasks[0]);
    expect(await getTask(db, 'nope')).toBeNull();
    const draft = await getTask(db, '01J8QC', new Date(SEED_NOW.getTime() + 3_600_000));
    expect(draft?.clock?.dueIn).toBe('18 h 12 m');
  });

  it('seeding again changes nothing', async () => {
    await seedDemo(db);
    expect((await getFleet(db, SEED_NOW)).projects).toHaveLength(184);
    expect(await getNeedsYou(db, LEDGERLINE_ID, SEED_NOW)).toEqual(DEMO.needsYou);
    expect(await getTasks(db, LEDGERLINE_ID, SEED_NOW)).toEqual(DEMO.tasks);
  });
});

describe('views never invent what the index cannot know', () => {
  it('shows a project with no facts as unknown', async () => {
    const empty = await memoryIndex();
    await empty.query(`insert into fleet_group (path, ord) values ('g', 0)`);
    await upsertProjects(empty, [{
      id: 'bare', gitlabId: null, name: 'bare', what: '', groupPath: 'g', state: 'not-set-up', setupStep: null, ord: 0,
      armed: 0, proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
    }]);
    const [p] = (await getFleet(empty, SEED_NOW)).projects;
    expect(p).toMatchObject({ proofs7d: null, demotions7d: null, feed: { ageSec: null, ok: null }, stages: Array(9).fill(null) });
    expect(p).not.toHaveProperty('env');
    expect(p).not.toHaveProperty('last');
  });
});
