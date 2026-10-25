// Which adapter answers which probe kind: Azure Pipelines and GitLab CI for CI, App Insights or a Log Analytics
// workspace for the cloud; git and local probes live in discover.
import type { CiProviderKind, CloudProviderKind, ProbeKind } from '@/schemas/vitals';
import type { CiProvider, CloudProvider, Exec } from './types';
import { azurePipelines } from './azure';
import { defaultExec } from './exec';
import { gitlabCi } from './gitlab';
import { azureInsights } from './azure/insights';
import { azureLogs } from './azure/logs';

export function ciProvider(kind: Exclude<CiProviderKind, 'none'>, exec?: Exec): CiProvider {
  return kind === 'azure-pipelines' ? azurePipelines(exec ?? defaultExec) : gitlabCi(exec ?? defaultExec);
}

export function cloudProvider(kind: Exclude<CloudProviderKind, 'none'>, exec?: Exec): CloudProvider {
  return kind === 'azure-log-analytics' ? azureLogs(exec ?? defaultExec) : azureInsights(exec ?? defaultExec);
}

/** The provider family a probe kind belongs to: 'az-devops-*' -> azure-pipelines, 'glab-*' -> gitlab-ci, ... */
export function probeOwner(kind: ProbeKind): 'azure-pipelines' | 'gitlab-ci' | 'azure-app-insights' | 'azure-log-analytics' | 'local' {
  if (kind.startsWith('az-devops') || kind === 'az-login') return 'azure-pipelines';
  if (kind.startsWith('glab')) return 'gitlab-ci';
  if (kind.startsWith('az-appinsights')) return 'azure-app-insights';
  if (kind.startsWith('az-loganalytics')) return 'azure-log-analytics';
  return 'local';
}
