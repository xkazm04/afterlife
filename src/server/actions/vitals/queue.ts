// queue-runs: N runs of one of the project's pipelines on the change's branch, queued as the person's own az login, so
// a claim is re-measured on runs made for it. The preview spells the exact `az pipelines run` N times; the confirm runs
// them in order (a failure stops the rest) and records the queued run ids beside the claim (<data>/vitals/<slug>/
// queued.jsonl). It measures nothing itself: the next collect stores those runs and compares exactly them.
import type { AdjustmentClaim } from '@/schemas/vitals';
import { orgUrl } from '@/server/providers/azure/args';
import { appendQueued, readAdjustments } from '@/server/vitals';
import type { CommandOutcome, QueueRuns } from '../types';
import { displayOf, errorLine, ProjectRefused, type ProjectDeps, type ProjectPlan } from './context';

export const QUEUE_RISK = 'low' as const;

export function planQueue(deps: ProjectDeps, intent: QueueRuns): ProjectPlan {
  const cfg = deps.project(intent.project);
  if (!cfg) throw new ProjectRefused(`no saved project has the slug ${intent.project}`);
  if (cfg.ci.provider !== 'azure-pipelines') throw new ProjectRefused(`queue-runs queues Azure Pipelines runs; ${cfg.slug}'s CI is ${cfg.ci.provider}`);
  const { org, project } = cfg.host;
  if (cfg.host.kind !== 'azure-devops' || !org || !project) throw new ProjectRefused(`${cfg.slug} has no Azure DevOps org and project saved`);
  const pipeline = cfg.ci.pipelines.find((p) => p.id === intent.pipelineId);
  if (!pipeline) throw new ProjectRefused(`pipeline ${intent.pipelineId} is not one of ${cfg.slug}'s (${cfg.ci.pipelines.map((p) => `${p.id} ${p.name}`).join(', ')})`);
  const claim = readAdjustments(cfg.slug).find((l): l is AdjustmentClaim => l.type === 'claim' && l.id === intent.claimId);
  if (!claim) throw new ProjectRefused(`no claim ${intent.claimId} in ${cfg.slug}`);
  if (claim.target.kind !== 'ci-stage' && claim.target.kind !== 'ci-run') throw new ProjectRefused(`a ${claim.target.kind} claim is not measured by CI runs`);

  const argv = ['pipelines', 'run', '--org', orgUrl(org), '--project', project, '--id', pipeline.id, '--branch', intent.branch, '-o', 'json'];
  const commands = Array.from({ length: intent.n }, () => ({ display: displayOf('az', argv), argv, risk: QUEUE_RISK }));
  const rule = cfg.ci.variants.find((v) => v.id === claim.target.variant);
  const notes = [
    `Runs as your own az login on ${pipeline.name} (${pipeline.id}): each run spends that pipeline's agent time.`,
    'The run ids are kept beside the claim; the next collect stores the runs and measures exactly them (method queued).',
    ...(rule?.match.parameter ? [`The ${rule.id} variant is told apart by ${rule.match.parameter.name}=${rule.match.parameter.value}; these runs do not set it.`] : []),
  ];

  const run = async (): Promise<CommandOutcome[]> => {
    const results: CommandOutcome[] = [];
    const ids: string[] = [];
    for (const c of commands) {
      const r = await deps.exec('az', c.argv, { timeoutMs: 120_000 });
      let id: string | undefined;
      try {
        const j = r.code === 0 ? (JSON.parse(r.stdout) as { id?: unknown }) : null;
        id = j && (typeof j.id === 'number' || typeof j.id === 'string') && /^\d+$/.test(String(j.id)) ? String(j.id) : undefined;
      } catch {
        id = undefined;
      }
      if (r.code !== 0 || !id) {
        results.push({ display: c.display, exit: r.code || 1, ok: false, simulated: false, error: r.code ? errorLine(r.stderr, r.code) : 'az answered without a run id' });
        break; // the person asked for N; a refused one says why the rest would be too
      }
      ids.push(id);
      results.push({ display: c.display, exit: 0, ok: true, simulated: false, made: `run ${id}` });
    }
    if (ids.length) appendQueued(cfg.slug, { claimId: claim.id, runIds: ids, at: deps.now().toISOString() });
    return results;
  };

  return {
    title: `Queue ${intent.n} run${intent.n === 1 ? '' : 's'} of ${pipeline.name} on ${intent.branch}`,
    summary: `Queues ${intent.n} run${intent.n === 1 ? '' : 's'} on ${intent.branch} to re-measure "${claim.title}". Afterlife measures them itself once they are collected.`,
    commands,
    diff: [],
    notes,
    digestExtra: claim.id,
    run,
  };
}
