// What the Setup route needs, read through the data source on the server. Demo: the catalogue, as it always was. Live:
// the catalogue gives only the step titles, the tracks' names and the arm order (marked demo on screen); every state is
// read now, from GitLab and the index (`setupReads`): the tracks' arm blocks, the belay doctor and the observable steps.
import { getDataSource } from '@/server/data';
import { readLiveSetup } from '@/server/data/setup/read';
import type { SetupProviderProps } from '../hooks/SetupProvider';

export async function loadSetupData(): Promise<Omit<SetupProviderProps, 'children'>> {
  const ds = getDataSource();
  const setup = ds.getSetup();
  const reads = ds.setupReads();
  const live = reads ? await readLiveSetup(reads, setup.arm.map(([id]) => id)) : null;
  const illustrative = { steps: ds.illustrative.includes('setup'), tracks: ds.illustrative.includes('tracks') };
  return { setup, tracks: ds.getTracks(), classes: ds.getActionClasses(), live, illustrative, startTier: ds.getPolicy()?.startTier ?? null };
}
