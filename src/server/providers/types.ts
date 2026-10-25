// The seam between Afterlife and the outside world: one adapter per CI provider and per cloud, all reading through the
// person's own local CLI login (az, glab), read-only. A provider never throws for a lapsed login or a missing
// resource - it returns a `fail` probe whose summary names the re-login command.
import type { CiProviderKind, CiRun, CloudProviderKind, ProbeResult, ProbeSpec, ProdPoint, ProjectConfig } from '@/schemas/vitals';

/** Runs one CLI: argv only, never a shell string. Injected so tests swap in a fake CLI. */
export type Exec = (bin: string, args: readonly string[], opts?: { cwd?: string; timeoutMs?: number }) => Promise<{ code: number; stdout: string; stderr: string; ms: number }>;

export interface CiProvider {
  kind: Exclude<CiProviderKind, 'none'>;
  probe(spec: ProbeSpec): Promise<ProbeResult>;
  /** Runs newest first, each with its stages and jobs; only runs newer than `sinceRunId` when given. */
  listRuns(cfg: ProjectConfig, opts?: { sinceRunId?: string; maxDays?: number }): Promise<CiRun[]>;
}

export interface CloudProvider {
  kind: Exclude<CloudProviderKind, 'none'>;
  probe(spec: ProbeSpec): Promise<ProbeResult>;
  /** Binned production points from `since` (ISO) to now. */
  query(cfg: ProjectConfig, since: string): Promise<ProdPoint[]>;
}
