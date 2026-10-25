// The Azure Pipelines CiProvider: probes and runs through the person's own `az` login (azure-devops extension),
// read-only. `insights/` beside this file is the App Insights cloud provider.
import type { CiProvider, Exec } from '../types';
import { defaultExec } from '../exec';
import { listAzureRuns } from './listRuns';
import { azProbe } from './probes';

export function azurePipelines(exec: Exec = defaultExec, now: () => number = Date.now): CiProvider {
  return {
    kind: 'azure-pipelines',
    probe: (spec) => azProbe(exec, spec),
    listRuns: (cfg, opts) => listAzureRuns(exec, cfg, opts, now),
  };
}
