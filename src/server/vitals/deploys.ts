// Deploys as CI saw them: every succeeded stage named like swap or deploy, at the moment it finished, with the run's
// commit. A stage still running or without a finish time is not a deploy yet.
import type { CiRun, DeployMarker } from '@/schemas/vitals';

const DEPLOY = /swap|deploy/i;

/** Oldest first, the order a time axis draws them in. */
export function deployMarkers(runs: CiRun[]): DeployMarker[] {
  const out: DeployMarker[] = [];
  for (const run of runs) {
    for (const s of run.stages) {
      if (s.result === 'succeeded' && s.finishedAt && DEPLOY.test(s.name)) out.push({ runId: run.runId, stage: s.name, at: s.finishedAt, sha: run.sha });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
