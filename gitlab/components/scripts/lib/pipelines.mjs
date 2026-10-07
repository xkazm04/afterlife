// The tripwire's default-branch pipeline triggers: a post-merge proof that failed, and a default branch red for an hour.
// Two things used to hide a failed proof. The tripwire job (stage .post) was skipped once belay-proof-<class> failed, and a
// scheduled sweep read only the newest default-branch pipeline, which is its own and still running. Now the job runs
// `when: always` on default-branch push pipelines, and event mode reads its own pipeline's failed proof jobs; and every
// read here skips the current pipeline and every schedule pipeline (a sweep's own, or an earlier sweep's, holds no
// proof), and looks at finished pipelines only. See templates/tripwire/README.md.
// Endpoints: GET pipelines (ref, order_by, sort, per_page; `source` in each row), GET pipelines/:id, GET
// pipelines/:id/jobs (scope[]) [R].

const HOUR = 3_600_000;
const FINISHED = new Set(['success', 'failed', 'canceled', 'skipped']);
/** How many default-branch pipelines a run reads, newest first. */
export const RECENT = 20;

/** The belay-proof jobs that failed in a pipeline. */
function failedProofs(apiAll, projectId, pipelineId) {
  return apiAll(`projects/${projectId}/pipelines/${pipelineId}/jobs?scope[]=failed`, 1)
    .filter((j) => j.status === 'failed' && String(j.name).startsWith('belay-proof'));
}

/** When the proof failed: its last failed proof job's finish, so event mode and a later sweep name the same event. */
const failedAt = (jobs, pipeline) => jobs.map((j) => j.finished_at).filter(Boolean).sort().at(-1) ?? pipeline.updated_at;

/**
 * `ownPipelineId`: the pipeline this job runs in, never read as a finished one (in a sweep it is the schedule's, still
 * running). `headSha` (event mode): this pipeline is the default-branch push of that commit, so its own failed proof jobs
 * are read directly; the job runs after them because it is `when: always`. A sweep reads the finished default-branch
 * pipelines of the lookback, the newest run of each commit only (a retried proof that passed is no failure).
 * One event per pipeline: a failed proof is post_merge_proof_fail, never also default_branch_red_1h.
 * `mrFor(sha)`: the agent MR that merged the commit, or null; `eventFor(trigger, mr, at, evidence)` builds the event.
 */
export function pipelineEvents({ api, apiAll, projectId, branch, now, since, ownPipelineId, headSha, mrFor, eventFor }) {
  const out = [];
  const proofFailed = (pipeline, sha) => {
    const jobs = failedProofs(apiAll, projectId, pipeline.id);
    if (!jobs.length) return false;
    const mr = mrFor(sha);
    if (mr) out.push(eventFor('post_merge_proof_fail', mr, failedAt(jobs, pipeline), `pipeline ${pipeline.web_url}`));
    return true;
  };

  if (headSha && ownPipelineId) {
    const own = api(`projects/${projectId}/pipelines/${ownPipelineId}`);
    if (own) proofFailed(own, headSha);
  }

  const finished = (api(`projects/${projectId}/pipelines?ref=${branch}&order_by=id&sort=desc&per_page=${RECENT}`) ?? [])
    .filter((p) => String(p.id) !== String(ownPipelineId) && p.source !== 'schedule' && FINISHED.has(p.status));
  const seen = new Set();
  for (const [i, p] of finished.entries()) {
    if (seen.has(p.sha)) continue;
    seen.add(p.sha);
    if (i > 0 && Date.parse(p.updated_at) < Date.parse(since)) break;
    const proof = proofFailed(p, p.sha);
    // Red for an hour is about the branch as it is: the newest finished pipeline only.
    if (i === 0 && !proof && p.status === 'failed' && now - Date.parse(p.updated_at) >= HOUR) {
      const mr = mrFor(p.sha);
      if (mr) out.push(eventFor('default_branch_red_1h', mr, p.updated_at, `pipeline ${p.web_url}`));
    }
  }
  return out;
}
