// Finds demotion events for agent-authored MRs, from facts GitLab holds. Pure of any model.
// The event shape is this module's contract with `engine tripwire --event` (see components/README.md):
//   { trigger, agent, class, at, evidence }   (engine/decide/tripwire.ts TripwireEvent)
// trigger is one of trust-policy.yml's demotion triggers. Every endpoint below is [R] or [R?]; see the README.
import { blocks, CLASS_ID, trailer, trustedNotes } from './lib.mjs';

const HOUR = 3_600_000;

/** The agent-authored MR that put a commit on the default branch, or null. */
function agentMrFor(api, projectId, sha, prefix) {
  const mrs = api(`projects/${projectId}/repository/commits/${sha}/merge_requests`) ?? []; // [R]
  const mr = mrs.find((m) => (m.author?.username ?? '').startsWith(prefix) && m.state === 'merged');
  return mr ?? null;
}

function eventFor(trigger, mr, at, evidence) {
  const klass = trailer(mr.description, 'Belay-Class', CLASS_ID);
  if (!klass) return null; // no class, no tier to move
  return { trigger, agent: mr.author.username, class: klass, at, evidence: `!${mr.iid}: ${evidence}` };
}

export function detect({ api, apiAll, gql, projectId, branch, now, lookbackHours, prefix, guardrailAuthors, headSha }) {
  const since = new Date(now - lookbackHours * HOUR).toISOString();
  const found = [];
  const add = (e) => e && found.push(e);

  // 1. revert: a "Revert" commit on the default branch whose body names the commit it reverts.
  const commits = headSha
    ? [api(`projects/${projectId}/repository/commits/${headSha}`)]
    : apiAll(`projects/${projectId}/repository/commits?ref_name=${branch}&since=${since}`, 2);
  for (const c of commits.filter(Boolean)) {
    const m = /This reverts commit ([0-9a-f]{7,40})/.exec(c.message ?? '');
    if (!/^Revert "/.test(c.title ?? '') || !m) continue;
    const mr = agentMrFor(api, projectId, m[1], prefix);
    if (mr) add(eventFor('revert', mr, c.committed_date ?? c.created_at, `commit ${c.id}`));
  }

  // 2. default branch red for an hour, and 3. a post-merge proof job that failed (job names start belay-proof).
  const [latest] = api(`projects/${projectId}/pipelines?ref=${branch}&order_by=id&sort=desc&per_page=1`) ?? [];
  if (latest?.status === 'failed') {
    const mr = agentMrFor(api, projectId, latest.sha, prefix);
    const failedJobs = apiAll(`projects/${projectId}/pipelines/${latest.id}/jobs?scope[]=failed`, 1);
    if (mr && failedJobs.some((j) => String(j.name).startsWith('belay-proof'))) {
      add(eventFor('post_merge_proof_fail', mr, latest.updated_at, `pipeline ${latest.web_url}`));
    }
    if (mr && now - Date.parse(latest.updated_at) >= HOUR) {
      add(eventFor('default_branch_red_1h', mr, latest.updated_at, `pipeline ${latest.web_url}`));
    }
  }

  // 4. reopened finding: a merged agent MR with a Belay-Finding trailer whose vulnerability is open again.
  const merged = apiAll(`projects/${projectId}/merge_requests?state=merged&updated_after=${since}`, 1)
    .filter((m) => (m.author?.username ?? '').startsWith(prefix));
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
  const recent = apiAll(`projects/${projectId}/merge_requests?state=all&updated_after=${since}`, 1)
    .filter((m) => (m.author?.username ?? '').startsWith(prefix))
    .slice(0, 50);
  for (const m of recent) {
    for (const note of trustedNotes(projectId, m.iid, guardrailAuthors)) {
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
