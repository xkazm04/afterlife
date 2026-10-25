// The OPEN proposals of a repo's lens-scan store (<repo>/.ai/lens-scan/scan.db, written by the lens-scan skill), as
// plan evidence. Read-only: the file is opened `readOnly` (or `immutable`, see openTarget) and only SELECTed; a
// missing file is no ideas, and a store that cannot be read is printed and gives none: evidence never stops a plan.
// Open = status `proposed`, `approved` or `rework`: not landed (`done`, `accepted`, `released`), not being built
// (`executing`), not refused (`declined`, `descoped`, `failed`).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Idea } from './types';

/** The slice of node:sqlite used here (@types/node 20 has no types for it; Node 22.5+ has the module). */
interface Db {
  prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[] };
  close(): void;
}
type DbCtor = new (file: string | URL, o: { readOnly: boolean }) => Db;

/**
 * Even a `readOnly` connection writes the store's `-shm` index when the store is in WAL mode. With no WAL content (no
 * `-wal` file, or an empty one) every committed row is in the main file, so it is opened `immutable`: SQLite then
 * touches no file at all. A non-empty WAL holds rows the main file has not, so that store is opened readOnly as is.
 */
function openTarget(file: string): string | URL {
  const wal = fs.statSync(`${file}-wal`, { throwIfNoEntry: false });
  if (wal && wal.size > 0) return file;
  const u = pathToFileURL(file);
  u.search = '?mode=ro&immutable=1';
  return u;
}

export const lensScanFile = (repoPath: string): string => path.join(repoPath, '.ai', 'lens-scan', 'scan.db');
export const OPEN_STATUSES = ['proposed', 'approved', 'rework'] as const;

// Severity first (tier 0 stop-ship .. 3 backlog; untriaged last), then a person's yes (approved, then rework), then
// the size a lane can finish in one session (XS first), then the lower change risk, then the newest.
const SQL = `SELECT id, feature, lens, title, body, size, tier, status FROM proposals
  WHERE status IN (${OPEN_STATUSES.map(() => '?').join(', ')})
  ORDER BY tier IS NULL, tier,
    CASE status WHEN 'approved' THEN 0 WHEN 'rework' THEN 1 ELSE 2 END,
    CASE size WHEN 'XS' THEN 0 WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 ELSE 5 END,
    risk IS NULL, risk, created_at DESC`;

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'bigint' ? String(v) : '');
const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** A proposal body's `## Description` (else `## Summary`, else the body without headings), as one line. */
export function bodyGist(body: string): string {
  const section = (name: string): string => {
    const parts = body.split(/^##\s+/m);
    const hit = parts.find((p) => p.toLowerCase().startsWith(name.toLowerCase()));
    return hit ? hit.slice(name.length) : '';
  };
  return flat(section('Description') || section('Summary') || body.replace(/^#+.*$/gm, ''));
}

export function lensScanIdeas(repoPath: string): Idea[] {
  const file = lensScanFile(repoPath);
  if (!fs.existsSync(file)) return [];
  let db: Db | undefined;
  try {
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: DbCtor };
    db = new DatabaseSync(openTarget(file), { readOnly: true });
    return db.prepare(SQL).all(...OPEN_STATUSES).map((r) => {
      const tier = r.tier === null || r.tier === undefined ? '' : `tier ${str(r.tier)}`;
      const tags = [`${str(r.lens)}/${str(r.feature)}`, str(r.size), tier, str(r.status)].filter(Boolean);
      return { source: 'lens-scan' as const, ref: str(r.id), tags, title: flat(str(r.title)), detail: bodyGist(str(r.body)) };
    });
  } catch (e) {
    console.error(`runner: lens-scan ideas: could not read ${file}: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  } finally {
    db?.close();
  }
}
