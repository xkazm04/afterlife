// Settings' slices for the screen stream (GET /api/screen/<key>). Only Data & connection reads anything: the server's
// environment, as four strings. Display, Keyboard and About declare no slice and have no loader (they read nothing).
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { readConnection } from '../data/connection';

export const loaders: ModuleLoaders = {
  'settings/data': { slices: { connection: () => ok(readConnection()) } },
};
