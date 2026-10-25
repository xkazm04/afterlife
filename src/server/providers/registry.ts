// Which adapter answers which probe kind. WP2 fills the CI providers, WP4 the cloud one; git and local probes live
// in discover (WP1).
import type { CiProviderKind, CloudProviderKind, ProbeKind } from '@/schemas/vitals';
import type { CiProvider, CloudProvider, Exec } from './types';
import { azurePipelines } from './azure';
import { defaultExec } from './exec';
import { gitlabCi } from './gitlab';

export function ciProvider(kind: Exclude<CiProviderKind, 'none'>, exec?: Exec): CiProvider {
  return kind === 'azure-pipelines' ? azurePipelines(exec ?? defaultExec) : gitlabCi(exec ?? defaultExec);
}

export function cloudProvider(kind: Exclude<CloudProviderKind, 'none'>, exec?: Exec): CloudProvider {
  void kind; void exec;
  throw new Error('providers: cloudProvider not built (WP4)');
}

/** The provider family a probe kind belongs to: 'az-devops-*' -> azure-pipelines, 'glab-*' -> gitlab-ci, ... */
export function probeOwner(kind: ProbeKind): 'azure-pipelines' | 'gitlab-ci' | 'azure-app-insights' | 'local' {
  if (kind.startsWith('az-devops') || kind === 'az-login') return 'azure-pipelines';
  if (kind.startsWith('glab')) return 'gitlab-ci';
  if (kind.startsWith('az-appinsights')) return 'azure-app-insights';
  return 'local';
}
