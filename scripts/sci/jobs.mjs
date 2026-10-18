// Reads a GitLab jobs export into flat job records. Pure: no file, no network. Accepted shapes:
//   - the array `glab api projects/:id/pipelines/:id/jobs` returns, or several of them back to back (a shell loop's output,
//     or `glab api --paginate`, which prints one array per page);
//   - { pipelines: [...], jobs: { "<pipelineId>": [...] } }, the shape of src/server/gitlab/__fixtures__/docs/ledgerline/ci.json.

const MR_REF = /^refs\/merge-requests\/(\d+)\/(?:head|merge|train)$/;
/** Statuses that will not change again. A running or pending job is left out and counted as `unfinished`. */
const FINAL = new Set(['success', 'failed', 'canceled', 'cancelled', 'skipped', 'manual']);

/** Splits back-to-back JSON documents ("[...][...]", one per line or not) and parses each. */
export function parseDocuments(text) {
  const docs = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '[' || c === '{') {
      if (depth++ === 0) start = i;
    } else if (c === ']' || c === '}') {
      if (--depth === 0) docs.push(JSON.parse(text.slice(start, i + 1)));
      if (depth < 0) throw new Error(`unbalanced JSON at offset ${i}`);
    }
  }
  if (depth !== 0) throw new Error('the input ends inside a JSON document');
  return docs;
}

/** Every raw job in the export, each with `pipeline` filled in from its container when the job does not carry it. */
export function rawJobs(text) {
  const out = [];
  for (const doc of parseDocuments(text)) {
    if (Array.isArray(doc)) {
      out.push(...doc);
      continue;
    }
    const pipelines = new Map((doc.pipelines ?? []).map((p) => [String(p.id), p]));
    const jobs = doc.jobs ?? {};
    const groups = Array.isArray(jobs) ? [[null, jobs]] : Object.entries(jobs);
    for (const [pid, list] of groups) {
      for (const j of list) out.push({ ...j, pipeline: { ...(pid !== null ? pipelines.get(pid) : {}), ...j.pipeline } });
    }
  }
  return out;
}

/** belay-proof-<class>, belay-tier-gate, belay-maturity-scan, belay-apply-*: the proof layer. Anything else is the project's own CI. */
export function kindOf(name) {
  if (name.startsWith('belay-proof-')) return 'proof';
  if (name === 'belay-tier-gate') return 'gate';
  if (name === 'belay-maturity-scan') return 'scan';
  if (name.startsWith('belay-apply-')) return 'apply';
  return 'project';
}

/** The runner size from the job's tags, else from the hosted runner's description, else the book's default. */
export function sizeOf(job, runner) {
  const tags = job.tag_list ?? [];
  const desc = job.runner?.description ?? '';
  for (const [size, s] of Object.entries(runner.sizes)) {
    if (s.tags.some((t) => tags.includes(t) || desc.includes(t))) return size;
  }
  return runner.default;
}

/** Minutes the runner held the job: GitLab's `duration` (seconds, created and pending time excluded), else start to finish. */
export function minutesOf(job) {
  if (typeof job.duration === 'number') return job.duration / 60;
  if (job.started_at && job.finished_at) return Math.max(0, Date.parse(job.finished_at) - Date.parse(job.started_at)) / 60_000;
  return 0;
}

/** Flat records, one per job id (an id seen twice in overlapping exports counts once). */
export function normalize(raw, runner) {
  const seen = new Set();
  const jobs = [];
  let unfinished = 0;
  for (const j of raw) {
    if (seen.has(j.id)) continue;
    seen.add(j.id);
    const status = j.status === 'cancelled' ? 'canceled' : j.status;
    if (!FINAL.has(j.status)) {
      unfinished++;
      continue;
    }
    const ref = j.pipeline?.ref ?? j.ref ?? '';
    const m = MR_REF.exec(ref);
    const project = j.pipeline?.project_id ?? j.project_id ?? null;
    jobs.push({
      id: j.id, name: j.name, kind: kindOf(j.name), status, minutes: minutesOf(j), size: sizeOf(j, runner),
      pipelineId: j.pipeline?.id ?? null, project, source: j.pipeline?.source ?? null,
      mr: m ? `${project ?? '?'}!${m[1]}` : null, startedAt: j.started_at ?? null, finishedAt: j.finished_at ?? null,
    });
  }
  return { jobs, unfinished };
}
