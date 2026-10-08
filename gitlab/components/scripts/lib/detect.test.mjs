// post_merge_proof_fail must see a failed proof on the default branch. It could not: the .post tripwire job was skipped
// once belay-proof-<class> failed, and a sweep read only the newest default-branch pipeline, its own, still running.
// detect() takes its reads as arguments, so these run in process against the harness's route map (no glab at all).
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../testing/harness.mjs';
import { detect, eventKey } from './detect.mjs';

const NOW = Date.parse('2026-10-07T12:00:00Z');
const SHA = 'a'.repeat(40);
const ago = (min) => new Date(NOW - min * 60_000).toISOString();
const mr = { iid: 7, state: 'merged', author: { username: 'ai-patcher-acme' }, description: 'Bump x\n\nBelay-Class: dep-bump.patch', merged_at: ago(30) };
const pipeline = (id, o = {}) => ({ id, sha: SHA, ref: 'main', status: 'success', source: 'push', updated_at: ago(10), web_url: `https://gitlab.example/acme/app/-/pipelines/${id}`, ...o });
const proofJob = (o = {}) => ({ id: 9001, name: 'belay-proof-dep-bump.patch', status: 'failed', finished_at: ago(12), ...o });

/** The group as GitLab would answer: one agent MR merged as SHA, the given default-branch pipelines and their jobs. */
function group({ pipelines, jobs = {} }) {
  const routes = {
    'projects/1/repository/commits': [],
    [`projects/1/repository/commits/${SHA}`]: { id: SHA, title: 'Merge branch bump-x', message: 'Merge branch bump-x' },
    [`projects/1/repository/commits/${SHA}/merge_requests`]: [mr],
    'projects/1/pipelines': pipelines,
    'projects/1/merge_requests': [mr],
    'projects/1/merge_requests/7/notes': [],
  };
  for (const p of pipelines) {
    routes[`projects/1/pipelines/${p.id}`] = p;
    routes[`projects/1/pipelines/${p.id}/jobs`] = jobs[p.id] ?? [];
  }
  return fakeApi(routes);
}
const run = (g, o = {}) => detect({ ...g, projectId: 1, branch: 'main', now: NOW, lookbackHours: 24, prefix: 'ai-', guardrailAuthors: 'ai-guardrail-acme', headSha: null, ownPipelineId: null, ...o });

describe('post_merge_proof_fail', () => {
  it('a failed proof on the default branch yields exactly one event, against the agent MR that merged it', () => {
    const events = run(group({ pipelines: [pipeline(501, { status: 'failed' })], jobs: { 501: [proofJob()] } }));
    expect(events).toEqual([
      { trigger: 'post_merge_proof_fail', agent: 'ai-patcher-acme', class: 'dep-bump.patch', at: ago(12), evidence: '!7: pipeline https://gitlab.example/acme/app/-/pipelines/501' },
    ]);
  });

  it('a sweep in its own running pipeline still sees the previous finished failed one', () => {
    const own = pipeline(502, { status: 'running', source: 'schedule', sha: 'b'.repeat(40) });
    const g = group({ pipelines: [own, pipeline(501, { status: 'failed' })], jobs: { 501: [proofJob()] } });
    expect(run(g, { ownPipelineId: '502' }).map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
    expect(g.calls.some((c) => c.startsWith('projects/1/pipelines/502'))).toBe(false); // its own pipeline is never read
  });

  it('skips an earlier sweep’s finished pipeline (it holds no proof) to reach the push pipeline behind it', () => {
    const earlierSweep = pipeline(503, { status: 'success', source: 'schedule', sha: 'c'.repeat(40) });
    const g = group({ pipelines: [earlierSweep, pipeline(501, { status: 'failed' })], jobs: { 501: [proofJob()] } });
    expect(run(g).map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
  });

  it('event mode reads the failed proof jobs of its own push pipeline, which is still running', () => {
    const own = pipeline(501, { status: 'running' });
    const g = group({ pipelines: [own, pipeline(500, { sha: 'd'.repeat(40) })], jobs: { 501: [proofJob()] } });
    const events = run(g, { headSha: SHA, ownPipelineId: '501' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ trigger: 'post_merge_proof_fail', at: ago(12), evidence: '!7: pipeline https://gitlab.example/acme/app/-/pipelines/501' });
  });

  it('event mode and a later sweep name the same event, so the sweep skips what the push already recorded', () => {
    const inPush = run(group({ pipelines: [pipeline(501, { status: 'running' })], jobs: { 501: [proofJob()] } }), { headSha: SHA, ownPipelineId: '501' });
    const later = run(group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(2) })], jobs: { 501: [proofJob()] } }), { ownPipelineId: '600' });
    expect(later.map(eventKey)).toEqual(inPush.map(eventKey));
  });

  it('a passing pipeline yields none; nor does a failed one with no failed proof job but other failures', () => {
    expect(run(group({ pipelines: [pipeline(501)] }))).toEqual([]);
    const other = { ...proofJob(), name: 'unit-tests' };
    expect(run(group({ pipelines: [pipeline(501, { status: 'failed' })], jobs: { 501: [other] } }))).toEqual([]);
  });

  it('the newest run of a commit is its verdict: a proof that failed and then passed on a retry is no failure', () => {
    const g = group({ pipelines: [pipeline(504), pipeline(501, { status: 'failed' })], jobs: { 504: [proofJob({ id: 9002, status: 'success' })], 501: [proofJob()] } });
    expect(run(g)).toEqual([]);
  });
});

// The sweep is what retries an event the push pipeline could not commit (exit 3, a moved tier-state.yml) or never ran.
// Only a pipeline that ran the proof is a run of it: the proof job runs in default-branch push pipelines only.
describe('post_merge_proof_fail: a newer pipeline of the same commit that ran no proof hides nothing', () => {
  const failed = pipeline(501, { status: 'failed' });

  it.each([
    ['a child pipeline (trigger: include)', 'parent_pipeline'],
    ['an API pipeline (a maturity scan, a ledger event)', 'api'],
    ['a pipeline run from the web UI', 'web'],
    ['a trigger-token pipeline', 'trigger'],
  ])('%s', (_what, source) => {
    const newer = pipeline(502, { source, status: 'success', updated_at: ago(5) });
    const events = run(group({ pipelines: [newer, failed], jobs: { 501: [proofJob()] } }), { ownPipelineId: '600' });
    expect(events.map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
  });

  it('a newer push pipeline of the same commit with no proof job (a tag named like the branch [R?]) hides nothing either', () => {
    const tag = pipeline(502, { status: 'success', updated_at: ago(5) });
    expect(run(group({ pipelines: [tag, failed], jobs: { 501: [proofJob()] } })).map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
  });

  it('asks GitLab for push pipelines, so ten-minute sweep schedules do not push a failed proof out of the window', () => {
    const g = group({ pipelines: [failed], jobs: { 501: [proofJob()] } });
    run(g);
    expect(g.calls.filter((c) => c.startsWith('projects/1/pipelines?')).some((c) => /[?&]source=push(&|$)/.test(c))).toBe(true);
  });

  it('finds a failed proof job past the first 100 jobs of its pipeline', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `test ${i + 1}/100`, status: 'failed', finished_at: ago(13) }));
    const g = group({ pipelines: [failed], jobs: { 501: [] } });
    const pages = (p) => (/[?&]page=2(&|$)/.test(p) ? [proofJob()] : many);
    const api = (p, o) => (p.startsWith('projects/1/pipelines/501/jobs') ? pages(p) : g.api(p, o));
    const apiAll = (p, maxPages = 5) => {
      const rows = [];
      for (let page = 1; page <= maxPages; page++) {
        const got = api(`${p}${p.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        rows.push(...got);
        if (got.length < 100) break;
      }
      return rows;
    };
    expect(run({ ...g, api, apiAll }).map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
  });
});

describe('default_branch_red_1h', () => {
  it('the newest finished pipeline failed an hour ago without a proof failure: red for an hour', () => {
    const g = group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [{ ...proofJob(), name: 'build' }] } });
    expect(run(g).map((e) => e.trigger)).toEqual(['default_branch_red_1h']);
  });

  // The tripwire job fails its own push pipeline when it skips an event (exit 2: say an agent MR's Belay-Class names a class
  // it holds no record of, which recurs on every run for the lookback) or finds tier-state.yml moved (exit 3).
  it('the tripwire’s own failure is not the branch red: it never demotes the agent that merged the commit', () => {
    const tripwire = { id: 9100, name: 'belay-tripwire', status: 'failed', finished_at: ago(71) };
    const lint = { id: 9101, name: 'lint', status: 'failed', allow_failure: true, finished_at: ago(72) };
    const g = group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [tripwire, lint] } });
    expect(run(g)).toEqual([]);
  });

  it('a pipeline red by a job of its own, beside the tripwire, or with no job at all (invalid CI config) is still red', () => {
    const tripwire = { id: 9100, name: 'belay-tripwire', status: 'failed', finished_at: ago(71) };
    const both = group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [tripwire, { id: 9102, name: 'build', status: 'failed' }] } });
    expect(run(both).map((e) => e.trigger)).toEqual(['default_branch_red_1h']);
    const none = group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [] } });
    expect(run(none).map((e) => e.trigger)).toEqual(['default_branch_red_1h']);
  });

  it('one failed proof is one demotion: never post_merge_proof_fail and default_branch_red_1h for the same pipeline', () => {
    const g = group({ pipelines: [pipeline(501, { status: 'failed', updated_at: ago(70) })], jobs: { 501: [proofJob({ finished_at: ago(72) })] } });
    expect(run(g).map((e) => e.trigger)).toEqual(['post_merge_proof_fail']);
  });
});

describe('guardrail_high: F65, an agent cannot push its blocked MR out of the window by opening more MRs', () => {
  /** `count` agent MRs updated in the lookback, newest first as GitLab lists them; the oldest, !1, has a high guardrail block. */
  function many(count) {
    const mrs = Array.from({ length: count }, (_, i) => ({ iid: count - i, state: 'opened', author: { username: 'ai-patcher-acme' }, description: 'x\n\nBelay-Class: dep-bump.patch' }));
    const block = { id: 77, system: false, author: { username: 'ai-guardrail-acme' }, created_at: ago(60), body: `\`\`\`belay-guardrail\n${JSON.stringify({ verdict: 'block', findings: [{ severity: 'high' }] })}\n\`\`\`` };
    const g = group({ pipelines: [] });
    const api = (p, o) => {
      const [base, query = ''] = p.split('?');
      const q = new URLSearchParams(query);
      if (base === 'projects/1/merge_requests') {
        const per = Number(q.get('per_page') ?? 20);
        const page = Number(q.get('page') ?? 1);
        return (q.get('state') === 'merged' ? [] : mrs).slice((page - 1) * per, page * per);
      }
      const notes = /^projects\/1\/merge_requests\/(\d+)\/notes$/.exec(base);
      if (notes) return notes[1] === '1' && Number(q.get('page') ?? 1) === 1 ? [block] : [];
      return g.api(p, o);
    };
    const apiAll = (p, maxPages = 5) => {
      const rows = [];
      for (let page = 1; page <= maxPages; page++) {
        const got = api(`${p}${p.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        if (!Array.isArray(got) || got.length === 0) break;
        rows.push(...got);
        if (got.length < 100) break;
      }
      return rows;
    };
    return { ...g, api, apiAll };
  }

  it('the blocked MR behind 150 newer agent MRs is still read: one guardrail_high', () => {
    const events = run(many(151)).filter((e) => e.trigger === 'guardrail_high');
    expect(events).toEqual([expect.objectContaining({ agent: 'ai-patcher-acme', class: 'dep-bump.patch', evidence: '!1: note 77' })]);
  });

  it('past the cap of 2000 MRs it refuses to guess: the sweep goes red rather than miss an event', () => {
    expect(() => run(many(2001))).toThrow(/more than 2000 all MRs updated since .*: refusing to guess/);
  });
});

// F75: a 'Revert' commit names the commit it reverts in its own message, which its author writes. One that another agent's
// MR carried onto the default branch demotes nobody: agent B cannot demote agent A by merging a fake revert of A's commit.
describe('revert', () => {
  const R = 'e'.repeat(40);
  const revert = { id: R, title: 'Revert "Bump x"', message: `Revert "Bump x"\n\nThis reverts commit ${SHA}.`, committed_date: ago(20) };
  const other = { iid: 9, state: 'merged', author: { username: 'ai-gardener-acme' }, description: 'Tidy\n\nBelay-Class: docs.tidy' };
  const withRevert = (carriedBy) => {
    const routes = {
      'projects/1/repository/commits': [revert],
      [`projects/1/repository/commits/${SHA}/merge_requests`]: [mr],
      [`projects/1/repository/commits/${R}/merge_requests`]: carriedBy,
      'projects/1/pipelines': [],
      'projects/1/merge_requests': [],
    };
    return fakeApi(routes);
  };
  const reverts = (g) => run(g).filter((e) => e.trigger === 'revert');

  it('a person\'s revert, or the agent\'s own, demotes the agent whose MR merged the reverted commit', () => {
    const person = { iid: 8, state: 'merged', author: { username: 'a-maintainer' } };
    for (const carriedBy of [[], [person], [mr]]) {
      expect(reverts(withRevert(carriedBy))).toEqual([{ trigger: 'revert', agent: 'ai-patcher-acme', class: 'dep-bump.patch', at: ago(20), evidence: `!7: commit ${R}` }]);
    }
  });

  it('a revert that another agent\'s MR carried demotes nobody', () => {
    expect(reverts(withRevert([other]))).toEqual([]);
  });
});
