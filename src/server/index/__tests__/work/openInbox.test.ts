import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { countOpenInbox } from '../../repositories/work/proposal';
import { memoryIndex } from '../memoryIndex';

vi.mock('server-only', () => ({}));

// "Open, top-level proposals of a project" is the Needs-you count: the sidebar badge (views/needsYou) and the Fleet row's
// project.needs_you (poller/project) must be the same rule, so the predicate is spelled in one place: repositories/work/proposal.ts.
const SERVER = path.join(__dirname, '../../../');
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const spellings = (): string[] => {
  const hits: string[] = [];
  for (const f of fs.readdirSync(SERVER, { recursive: true, encoding: 'utf8' })) {
    if (!f.endsWith('.ts') || f.includes('__tests__') || /\.test\.ts$/.test(f)) continue;
    const src = strip(fs.readFileSync(path.join(SERVER, f), 'utf8'));
    if (/state\s*=\s*'open'\s+and\s+parent_id\s+is\s+null/.test(src)) hits.push(f.replace(/\\/g, '/'));
  }
  return hits.sort();
};

describe('the open-inbox count rule', () => {
  it('is written once in SQL, in the proposal repository', () => {
    expect(spellings()).toEqual(['index/repositories/work/proposal.ts']);
  });

  it('counts the open top-level proposals of one project only', async () => {
    const db = await memoryIndex();
    await db.exec(`insert into fleet_group (path, ord) values ('g', 0)`);
    for (const p of ['a', 'b']) await db.exec(`insert into project (id, name, group_path, state) values ('${p}', 'p', 'g', 'watching')`);
    await db.exec(`insert into proposal (id, project_id, kind, state, parent_id, title, opened_at) values
      ('1', 'a', 'gap', 'open', null, 't', now()), ('2', 'a', 'gap', 'open', '1', 't', now()), ('3', 'a', 'promotion', 'acted', null, 't', now()),
      ('4', 'a', 'promotion', 'open', null, 't', now()), ('5', 'b', 'promotion', 'open', null, 't', now())`);
    expect([await countOpenInbox(db, 'a'), await countOpenInbox(db, 'b'), await countOpenInbox(db, 'none')]).toEqual([2, 1, 0]);
  });
});
