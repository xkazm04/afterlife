// How far two engines' proposals for one repo agree, line kind by line kind: the same pipelines (by definition file,
// else id), the same variant ids, the same component paths, the same cloud hint. Pure, so a test pins it.
import type { Proposal } from '@/schemas/vitals';

export interface Agreement {
  pipelines: boolean;
  variants: boolean;
  components: boolean;
  cloud: boolean;
  /** How many of the four agree. */
  score: number;
}

const set = (xs: readonly string[]): string => [...new Set(xs)].sort().join('|');

export const pipelineKeys = (p: Proposal): string[] => p.ci.pipelines.map((x) => x.file ?? x.id);
export const variantIds = (p: Proposal): string[] => p.ci.variants.map((v) => v.id);
export const componentPaths = (p: Proposal): string[] => p.components.map((c) => c.path);
const cloudKey = (p: Proposal): string => `${p.cloud.provider}|${p.cloud.hint?.resourceGroup ?? ''}|${p.cloud.hint?.name ?? ''}`.toLowerCase();

export function agreement(a: Proposal, b: Proposal): Agreement {
  const out = {
    pipelines: set(pipelineKeys(a)) === set(pipelineKeys(b)),
    variants: set(variantIds(a)) === set(variantIds(b)),
    components: set(componentPaths(a)) === set(componentPaths(b)),
    cloud: cloudKey(a) === cloudKey(b),
  };
  return { ...out, score: Object.values(out).filter(Boolean).length };
}

/** The four variants and the component the Grinex acceptance names, as found in one proposal. */
export function grinexChecks(p: Proposal): { releaseLog: boolean; variants: Record<string, boolean>; appInsightsHint: boolean } {
  const ids = new Set(variantIds(p));
  return {
    releaseLog: p.components.some((c) => c.path === 'release-log'),
    variants: Object.fromEntries(['master-full', 'master-hotfix', 'pr-feature', 'nightly'].map((v) => [v, ids.has(v)])),
    appInsightsHint: p.cloud.provider === 'azure-app-insights' && !!p.cloud.hint?.resourceGroup,
  };
}
