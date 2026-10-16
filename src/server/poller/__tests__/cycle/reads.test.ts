// How often a cycle reads the project table: once, however many targets the group has. Each target used to re-read it
// (N+1 reads) only to see the rows the targets before it upserted.
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { listProjects } from '@/server/index/repositories/fleet/project';
import { runPollCycle } from '../../cycle';
import { cfg, NOW, rig } from '../helpers';

const PROJECT_TABLE = /from project order by/;

/** The demo group plus `extra` more projects that are the demo's ledgerline under other ids (and, for the first, its path). */
function crowded(port: GitLabPort, extra: number): GitLabPort {
  const alias = new Map<number, number>();
  return new Proxy(port, {
    get: (t, k, r) => {
      if (k === 'listProjects') {
        return async (group: string | number): Promise<GlProject[]> => {
          const all = await t.listProjects(group);
          const base = all.find((p) => p.path === 'ledgerline');
          if (!base) return all;
          const more = Array.from({ length: extra }, (_, i): GlProject => ({ ...base, id: base.id + 1000 + i, pathWithNamespace: `${base.pathWithNamespace}-${i}` }));
          for (const m of more) alias.set(m.id, base.id);
          return [...all, ...more];
        };
      }
      const fn = Reflect.get(t, k, r) as unknown;
      if (typeof fn !== 'function') return fn;
      return (...args: unknown[]) => (fn as (...a: unknown[]) => unknown).apply(t, typeof args[0] === 'number' && alias.has(args[0]) ? [alias.get(args[0]), ...args.slice(1)] : args);
    },
  });
}

/** The index, counting every read of the whole project table. */
function counting(db: PGlite): { db: PGlite; reads: () => number } {
  let n = 0;
  const proxy = new Proxy(db, {
    get: (t, k, r) => {
      if (k === 'query') return (sql: string, ...rest: unknown[]) => ((PROJECT_TABLE.test(sql) && n++), (t.query as (...a: unknown[]) => unknown)(sql, ...rest));
      const v = Reflect.get(t, k, r) as unknown;
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  });
  return { db: proxy, reads: () => n };
}

describe('the project table is read once per cycle', () => {
  it('whatever the number of targets', async () => {
    const x = await rig();
    const seen = counting(x.db);
    const res = await runPollCycle(crowded(x.gl.port, 3), seen.db, NOW, { cfg: cfg(), mem: x.mem });
    expect(res.projects).toHaveLength(4);
    expect(seen.reads()).toBe(1);
  }, 60_000);

  it('and a target still sees the ids the targets before it took', async () => {
    const x = await rig();
    const res = await runPollCycle(crowded(x.gl.port, 2), x.db, NOW, { cfg: cfg(), mem: x.mem });
    expect(res.projects.map((p) => p.id)).toEqual(['ledgerline', expect.stringMatching(/^ledgerline-\d+$/), expect.stringMatching(/^ledgerline-\d+$/)]);
    expect(new Set(res.projects.map((p) => p.id)).size).toBe(3);
    expect((await listProjects(x.db)).map((p) => p.id).sort()).toEqual(res.projects.map((p) => p.id).sort());
  }, 60_000);
});
