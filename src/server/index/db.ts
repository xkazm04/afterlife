// The one PGlite instance. Data lives under BELAY_DATA_DIR (default `.belay/` in the repo root, gitignored), in its
// `index/` folder; pass `{ memory: true }` for tests. The index is a cache: deleting the folder loses nothing
// that GitLab and the exported ledger cannot rebuild (see README).
import 'server-only';
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
  const db = opts.memory ? new PGlite() : new PGlite(indexDir(opts.dataDir));
  await db.waitReady;
  await migrate(db);
  return db;
}

// Kept on globalThis so Next's dev reloads do not open the data folder twice.
const KEY = Symbol.for('belay.index');
type Holder = { [KEY]?: Promise<PGlite> };

/** The single shared instance for the running app. */
export function getIndex(): Promise<PGlite> {
  const holder = globalThis as Holder;
  holder[KEY] ??= openIndex();
  return holder[KEY];
}

export async function closeIndex(): Promise<void> {
  const holder = globalThis as Holder;
  const open = holder[KEY];
  if (!open) return;
  holder[KEY] = undefined;
  await (await open).close();
}
