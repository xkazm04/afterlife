// Maturity's slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md). One slice, `core`: the
// maturity dataset and the stages (in memory, small), with the data source's project and mode riding along. A stage
// page answers notFound for a stage the data source does not have.
import { getDataSource } from '@/server/data';
import { notFound, ok, type ModuleLoaders } from '@/app/features/screens/types';
import { loadMaturityData } from '../data/loadMaturityData';
import { loadMaturityStage } from '../data/loadMaturityStage';

function core() {
  const ds = getDataSource();
  return ok({ ...loadMaturityData(), project: ds.deepProjectId(), mode: ds.mode });
}

export const loaders: ModuleLoaders = {
  maturity: { slices: { core } },
  'maturity/[stage]': { slices: { core: ({ params }) => (loadMaturityStage(params.stage ?? '') ? core() : notFound()) } },
};
