// Finds demotion events for agent-authored MRs, from facts GitLab holds. Pure of any model.
// The event shape is this module's contract with `engine tripwire --event` (see components/README.md):
//   { trigger, agent, class, at, evidence }   (engine/decide/tripwire.ts TripwireEvent)
// trigger is one of trust-policy.yml's demotion triggers. Every endpoint below is [R] or [R?]; see the README.
import { blocks, CLASS_ID, trailer, trustedNotes } from './lib.mjs';
import { pipelineEvents } from './pipelines.mjs';

const HOUR = 3_600_000;
/** Pages of 100 MRs read per list. Past them the sweep stops rather than guess (F65). */
const MR_PAGES = 20;

/** The agent-authored MR that put a commit on the default branch, or null. */
function agentMrFor(api, projectId, sha, prefix) {
  const mrs = api(`projects/${projectId}/repository/commits/${sha}/merge_requests`) ?? []; // [R]
  const mr = mrs.find((m) => (m.author?.username ?? '').startsWith(prefix) && m.state === 'merged');
  return mr ?? null;
}

/** The class an MR's description names now. Anyone who may edit the description can change it, even after the merge. */
export const trailerClass = (mr) => trailer(mr.description, 'Belay-Class', CLASS_ID);

/**
 * `headSha` (event mode): the default-branch commit this push pipeline is for. `ownPipelineId`: the pipeline this job runs
 * in (CI_PIPELINE_ID), which is still running and is never read as a finished one. `classOf(mr)`: the class an event of
 * that MR demotes (default: its Belay-Class trailer; belay-apply passes the class its gate decided on, F64).
 */
export function detect({ api, apiAll, gql, projectId, branch, now, lookbackHours, prefix, guardrailAuthors, headSha, ownPipelineId, classOf = trailerClass }) {
  const eventFor = (trigger, mr, at, evidence) => {
    const klass = classOf(mr);
    if (!klass) return null; // no class, no tier to move
    return { trigger, agent: mr.author.username, class: klass, at, evidence: `!${mr.iid}: ${evidence}` };
  };
  const since = new Date(now - lookbackHours * HOUR).toISOString();
  /**
   * Every MR of the lookback, all pages. A first page alone let an agent push its own blocked or reopened MR out of the
   * window by opening more MRs (F65); a list past the cap throws, so the sweep goes red instead of missing an event.
   */
  const mrsSince = (state) => {
    const rows = apiAll(`projects/${projectId}/merge_requests?state=${state}&updated_after=${since}`, MR_PAGES);
    if (rows.length >= MR_PAGES * 100) throw new Error(`more than ${MR_PAGES * 100} ${state} MRs updated since ${since}: refusing to guess`);
    return rows.filter((m) => (m.author?.username ?? '').startsWith(prefix));
  };
  const found = [];
  const add = (e) => e && found.push(e);

  // 1. revert: a "Revert" commit on the default branch whose body names the commit it reverts. Its author writes that body,
  // so a revert another agent's MR carried demotes nobody (F75): agent B cannot demote agent A with a fake revert of A's
  // commit. A person's revert and the agent's own still count. One read per revert commit.
  const commits = headSha
    ? [api(`projects/${projectId}/repository/commits/${headSha}`)]
    : apiAll(`projects/${projectId}/repository/commits?ref_name=${branch}&since=${since}`, 2);
  for (const c of commits.filter(Boolean)) {
    const m = /This reverts commit ([0-9a-f]{7,40})/.exec(c.message ?? '');
    if (!/^Revert "/.test(c.title ?? '') || !m) continue;
    const mr = agentMrFor(api, projectId, m[1], prefix);
    if (!mr) continue;
    const carrier = agentMrFor(api, projectId, c.id, prefix);
    if (carrier && carrier.author.username !== mr.author.username) {
      console.error(`belay: ${c.id.slice(0, 8)} reverts !${mr.iid} but came in through ${carrier.author.username}'s !${carrier.iid}: no demotion`);
      continue;
    }
    add(eventFor('revert', mr, c.committed_date ?? c.created_at, `commit ${c.id}`));
  }

  // 2. a post-merge proof job that failed (job names start belay-proof), and 3. the default branch red for an hour: read
  // from finished default-branch pipelines, never this job's own (pipelines.mjs).
  const mrFor = (sha) => agentMrFor(api, projectId, sha, prefix);
  for (const e of pipelineEvents({ api, apiAll, projectId, branch, now, since, ownPipelineId, headSha, mrFor, eventFor })) add(e);

  // 4. reopened finding: a merged agent MR with a Belay-Finding trailer whose vulnerability is open again.
  const merged = mrsSince('merged');
  for (const m of merged) {
    const id = trailer(m.description, 'Belay-Finding', /^\d+$/);
    if (!id) continue;
    const res = gql(`query { vulnerability(id: "gid://gitlab/Vulnerability/${id}") { state } }`); // [R?]
    const state = res?.data?.vulnerability?.state;
    if (state === 'DETECTED' || state === 'CONFIRMED') {
      add(eventFor('reopened_finding', m, m.merged_at, `vulnerability ${id} is ${state}`));
    }
  }

  // 5. guardrail high: a trusted guardrail note on an agent MR with a high-severity finding.
  const recent = mrsSince('all');
  for (const m of recent) {
    for (const note of trustedNotes(projectId, m.iid, guardrailAuthors, api)) {
      const v = blocks(note.body, 'belay-guardrail').at(-1);
      const high = Array.isArray(v?.findings) && v.findings.some((f) => f?.severity === 'high');
      if (v?.verdict === 'block' && high) add(eventFor('guardrail_high', m, note.created_at, `note ${note.id}`));
      if (v) break; // only the newest verdict counts
    }
  }
  return found;
}

/** Stable key used to make a sweep idempotent: the policy repo's own history is the record. */
export const eventKey = (e) => `${e.trigger}|${e.agent}|${e.class}|${e.at}|${e.evidence}`.replace(/\s+/g, ' ');
