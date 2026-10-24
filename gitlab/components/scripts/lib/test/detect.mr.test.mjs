// detect()'s MR-driven triggers: guardrail_high past the first page of agent MRs (F65), revert (F75) and reopened_finding.
// Its pipeline-driven triggers are in detect.test.mjs. These run in process against the harness's route map (no glab).
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../../testing/harness.mjs';
import { detect } from '../detect.mjs';
import { pageAll } from '../lib.mjs';

const NOW = Date.parse('2026-10-07T12:00:00Z');
const SHA = 'a'.repeat(40);
const ago = (min) => new Date(NOW - min * 60_000).toISOString();
const mr = { iid: 7, state: 'merged', author: { username: 'ai-patcher-acme' }, description: 'Bump x\n\nBelay-Class: dep-bump.patch', merged_at: ago(30) };

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
    const apiAll = (p, maxPages = 5, o) => pageAll(api, p, maxPages, o);
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

// reopened_finding reads the merged agent MRs and guardrail_high reads all of them; merged is a subset of all, so one
// listing serves both. Two listings were two reads of the same window, 2 requests where 1 does (more past 100 MRs).
describe('reopened_finding', () => {
  const finding = (iid, state) => ({ iid, state, author: { username: 'ai-patcher-acme' }, description: `Fix\n\nBelay-Class: dep-bump.patch\nBelay-Finding: ${iid}00`, merged_at: ago(30) });
  // The route map answers any state with the same list, as GitLab's 'all' does; detect() must pick the merged ones itself.
  const withMrs = (mrs, vulnState) => {
    const g = group({ pipelines: [] });
    const f = fakeApi({ 'projects/1/repository/commits': [], 'projects/1/pipelines': [], 'projects/1/merge_requests': mrs, 'projects/1/merge_requests/8/notes': [], 'projects/1/merge_requests/9/notes': [] });
    const asked = [];
    return { ...f, gql: (q) => (asked.push(q), { data: { vulnerability: { state: vulnState } } }), asked };
  };

  it('a merged agent MR whose vulnerability is open again demotes; an open MR is never asked about', () => {
    const g = withMrs([finding(8, 'merged'), finding(9, 'opened')], 'DETECTED');
    const events = run(g).filter((e) => e.trigger === 'reopened_finding');
    expect(events).toEqual([expect.objectContaining({ agent: 'ai-patcher-acme', class: 'dep-bump.patch', evidence: '!8: vulnerability 800 is DETECTED' })]);
    expect(g.asked).toHaveLength(1);
  });

  it('a resolved vulnerability demotes nobody', () => {
    expect(run(withMrs([finding(8, 'merged')], 'RESOLVED')).filter((e) => e.trigger === 'reopened_finding')).toEqual([]);
  });

  it('reads the lookback window of MRs once', () => {
    const g = withMrs([finding(8, 'merged')], 'RESOLVED');
    run(g);
    expect(g.calls.filter((c) => c.startsWith('projects/1/merge_requests?'))).toHaveLength(1);
  });
});
