import { PGlite } from '@electric-sql/pglite';
import { track } from '../../testing/closeDbs';
import { migrate } from '../migrations/migrate';

/** A migrated in-memory index. Tests that do not need db.ts use this, so they never import 'server-only'. */
export async function memoryIndex(): Promise<PGlite> {
  const db = track(new PGlite());
  await db.waitReady;
  await migrate(db);
  return db;
}
