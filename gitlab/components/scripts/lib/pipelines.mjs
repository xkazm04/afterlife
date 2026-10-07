// The tripwire's default-branch pipeline triggers: a post-merge proof that failed, and a default branch red for an hour.
// Two things used to hide a failed proof. The tripwire job (stage .post) was skipped once belay-proof-<class> failed, and a
// scheduled sweep read only the newest default-branch pipeline, which is its own and still running. Now the job runs
// `when: always` on default-branch push pipelines, and event mode reads its own pipeline's failed proof jobs; and every
// read here skips the current pipeline and every schedule pipeline (a sweep's own, or an earlier sweep's, holds no
// proof), and looks at finished pipelines only. The tripwire now runs from belay-apply, in sweep mode: ../../../apply/README.md.
// The sweep is also what retries an event the push pipeline could not commit (exit 3) or never ran, so it reads push
// pipelines only, the one source the proof job runs in (proof-engine's rules): a child, API, web or trigger pipeline of the
// same commit, newer and green, is no run of its proof and hides nothing, and schedule pipelines do not fill the window.
// Endpoints: GET pipelines (ref, source, order_by, sort, per_page; `source` in each row), GET pipelines/:id, GET
// pipelines/:id/jobs (retried jobs left out unless include_retried) [R].

const HOUR = 3_600_000;
const FINISHED = new Set(['success', 'failed', 'canceled', 'skipped']);
/** How many default-branch pipelines a run reads, newest first. */
export const RECENT = 20;
/** Pages of 100 jobs read per pipeline: a proof job behind 100 other jobs is still found. */
const JOB_PAGES = 5;


/** When the proof failed: its last failed proof job's finish, so event mode and a later sweep name the same event. */
const failedAt = (jobs, pipeline) => jobs.map((j) => j.finished_at).filter(Boolean).sort().at(-1) ?? pipeline.updated_at;

/**
 * `ownPipelineId`: the pipeline this job runs in, never read as a finished one (in a sweep it is the schedule's, still
 * running). `headSha` (event mode): this pipeline is the default-branch push of that commit, so its own failed proof jobs
 * are read directly; the job runs after them because it is `when: always`. A sweep reads the finished default-branch push
 * pipelines of the lookback; the newest one that ran the proof is the commit's verdict (a retried proof that passed is no
 * failure). One event per pipeline: a failed proof is post_merge_proof_fail, never also default_branch_red_1h.
 * `mrFor(sha)`: the agent MR that merged the commit, or null; `eventFor(trigger, mr, at, evidence)` builds the event.
 */
export function pipelineEvents({ api, apiAll, projectId, branch, now, since, ownPipelineId, headSha, mrFor, eventFor }) {
  const out = [];
  const proofFailed = new Set();
  const jobs = new Map();
  /** A pipeline's jobs, the latest attempt of each, read once. */
  const jobsOf = (id) => {
    if (!jobs.has(String(id))) jobs.set(String(id), apiAll(`projects/${projectId}/pipelines/${id}/jobs`, JOB_PAGES));
    return jobs.get(String(id));
  };
  /** Adds post_merge_proof_fail when the pipeline's proof failed. True when the pipeline ran the proof at all. */
  const readProof = (pipeline, sha) => {
    const proofs = jobsOf(pipeline.id).filter((j) => String(j.name).startsWith('belay-proof'));
    const failed = proofs.filter((j) => j.status === 'failed');
    if (failed.length) {
      proofFailed.add(String(pipeline.id));
      const mr = mrFor(sha);
      if (mr) out.push(eventFor('post_merge_proof_fail', mr, failedAt(failed, pipeline), `pipeline ${pipeline.web_url}`));
    }
    return proofs.length > 0;
  };

  if (headSha && ownPipelineId) {
    const own = api(`projects/${projectId}/pipelines/${ownPipelineId}`);
    if (own) readProof(own, headSha);
  }

  const finished = (filter) => (api(`projects/${projectId}/pipelines?ref=${branch}${filter}&order_by=id&sort=desc&per_page=${RECENT}`) ?? [])
    .filter((p) => String(p.id) !== String(ownPipelineId) && FINISHED.has(p.status));
  const seen = new Set();
  for (const [i, p] of finished('&source=push').filter((x) => (x.source ?? 'push') === 'push').entries()) {
    if (seen.has(p.sha)) continue;
    if (i > 0 && Date.parse(p.updated_at) < Date.parse(since)) break;
    if (readProof(p, p.sha)) seen.add(p.sha); // only a run of the proof stands for its commit
  }

  // Red for an hour is about the branch as it is: the newest finished pipeline that is not a schedule's. Not when the
  // tripwire's own job is all that failed (an event it skipped, exit 2; a moved tier-state.yml, exit 3): that is not the
  // merged change's doing. A pipeline that failed with no job at all (invalid CI config) is still red.
  const onlyTripwire = (p) => {
    const failed = jobsOf(p.id).filter((j) => j.status === 'failed' && j.allow_failure !== true);
    return failed.length > 0 && failed.every((j) => j.name === 'belay-tripwire');
  };
  const [latest] = finished('').filter((p) => p.source !== 'schedule');
  if (latest && !proofFailed.has(String(latest.id)) && latest.status === 'failed' && now - Date.parse(latest.updated_at) >= HOUR && !onlyTripwire(latest)) {
    const mr = mrFor(latest.sha);
    if (mr) out.push(eventFor('default_branch_red_1h', mr, latest.updated_at, `pipeline ${latest.web_url}`));
  }
  return out;
}
