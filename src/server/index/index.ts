// Public surface of the local index. Server-only: import from route handlers, server actions and loaders.
import 'server-only';

export { closeIndex, getIndex, indexDir, openIndex, type OpenOptions } from './db';
export { migrate, MIGRATIONS } from './migrations/migrate';
export * from './repositories';
export * from './views';
export { seedDemo, SEED_NOW, type SeedOptions } from './seed';
