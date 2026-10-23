// "Decided this week": a project's proposals acted on in the 7 days before now, newest first, with when and by whom.
import { describe, expect, it } from 'vitest';
import { getDecided } from '../../views/needsYou';
import { memoryIndex } from '../memoryIndex';

describe('getDecided', () => {
  it('returns the acted rows of the last 7 days, newest first, with actedAt (ISO) and actedAs', async () => {
    const db = await memoryIndex();
    await db.exec(`insert into fleet_group (path, ord) values ('g', 0)`);
    for (const p of ['a', 'b']) await db.exec(`insert into project (id, name, group_path, state) values ('${p}', 'p', 'g', 'watching')`);
    await db.exec(`insert into proposal (id, project_id, kind, state, parent_id, title, opened_at, acted_at, acted_as) values
      ('old', 'a', 'promotion', 'acted', null, 'eight days ago', '2026-10-01Z', '2026-10-14T09:00:00Z', 'op'),
      ('p1', 'a', 'promotion', 'acted', null, 'two days ago', '2026-10-01Z', '2026-10-20T09:00:00Z', 'op'),
      ('g1', 'a', 'gap', 'acted', null, 'one day ago', '2026-10-01Z', '2026-10-21T09:00:00Z', null),
      ('d1', 'a', 'readmit', 'dismissed', null, 'dismissed', '2026-10-01Z', '2026-10-21T10:00:00Z', 'op'),
      ('x1', 'a', 'gap', 'expired', null, 'expired', '2026-10-01Z', '2026-10-21T11:00:00Z', null),
      ('o1', 'a', 'gap', 'open', null, 'open', '2026-10-01Z', null, null),
      ('b1', 'b', 'promotion', 'acted', null, 'other project', '2026-10-01Z', '2026-10-21T09:00:00Z', 'op')`);
    expect(await getDecided(db, 'a', new Date('2026-10-22T09:00:00Z'))).toEqual([
      { id: 'g1', kind: 'gaps', project: 'a', title: 'one day ago', actedAt: '2026-10-21T09:00:00.000Z', actedAs: null },
      { id: 'p1', kind: 'promote', project: 'a', title: 'two days ago', actedAt: '2026-10-20T09:00:00.000Z', actedAs: 'op' },
    ]);
  });
});
