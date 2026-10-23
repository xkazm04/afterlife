// The one PGlite instance. Data lives under BELAY_DATA_DIR (default `.belay/` in the repo root, gitignored), in its
// `index/` folder; pass `{ memory: true }` for tests. The index is a cache of GitLab and the exported ledger, except
// commands_run and action_runs, Belay's own records: deleting the folder loses those two (see README).
import 'server-only';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from './migrations/migrate';

export interface OpenOptions {
  /** In-memory database (tests, demo-without-disk). */
  memory?: boolean;
  /** Overrides BELAY_DATA_DIR. */
  dataDir?: string;
}

export function indexDir(dataDir?: string): string {
  const base = dataDir ?? process.env.BELAY_DATA_DIR ?? path.join(process.cwd(), '.belay');
  return path.join(base, 'index');
}

/** Opens a fresh handle and applies migrations. Use `getIndex()` in the app; this is for tests and tools. */
export async function openIndex(opts: OpenOptions = {}): Promise<PGlite> {
  if (!opts.memory) mkdirSync(indexDir(opts.dataDir), { recursive: true }); // PGlite creates only the last folder
  const db = opts.memory ? new PGlite() : new PGlite(indexDir(opts.dataDir));
  await db.waitReady;
  try {
    await migrate(db);
  } catch (err) {
    await db.close().catch(() => undefined); // a refused folder must not stay open under the retry that follows
    throw err;
  }
  return db;
}

// Kept on globalThis so Next's dev reloads do not open the data folder twice.
const KEY = Symbol.for('belay.index');
type Holder = { [KEY]?: Promise<PGlite> };

/** The single shared instance for the running app. */
export function getIndex(): Promise<PGlite> {
  const holder = globalThis as Holder;
  const shared = holder[KEY];
  if (shared) return shared;
  const opening = openIndex();
  holder[KEY] = opening;
  // A failed open is not kept: the next call retries instead of replaying the rejection until the process restarts.
  opening.catch(() => {
    if (holder[KEY] === opening) holder[KEY] = undefined;
  });
  return opening;
}

export async function closeIndex(): Promise<void> {
  const holder = globalThis as Holder;
  const open = holder[KEY];
  if (!open) return;
  holder[KEY] = undefined;
  await (await open).close();
}
