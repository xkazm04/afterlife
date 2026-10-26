// Trace's slice for the screen stream (GET /api/screen/trace): `facts`, what the server knows without probing GitLab
// (its environment and the live gate: in memory). `?rehearse=not-ready` rides in the query. The probe itself stays
// GET /api/trace, run by the screen.
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadTraceFacts } from '../data/facts';

export const loaders: ModuleLoaders = {
  trace: { slices: { facts: ({ search }) => ok(loadTraceFacts(search.get('rehearse') === 'not-ready')) } },
};
