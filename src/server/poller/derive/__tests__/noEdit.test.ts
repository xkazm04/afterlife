// The no-edit fact, stated on a merged task row from its push notes (derive/task.ts), and the ratio counted from it
// (derive/counters.ts): only from facts a row states, never from a merge whose notes nobody read.
import { describe, expect, it } from 'vitest';
import type { GlMergeRequest, GlNote } from '@/server/gitlab/types';
import { cfg } from '../../__tests__/helpers';
import { editedBefore, isPushNote } from '../../parse/pushes';
import { countRecord, type CountedEvent, type CountedTask, type CounterSource } from '../counters';
import { deriveTask } from '../task';

const NOW = new Date('2026-10-06T14:22:00Z');
const DAY = 86_400_000;
const AGENT = 'ai-qa-acme-lab';
const CLS = 'qa.file-bug';
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const merged = (iid: number, edited?: boolean): CountedTask => ({
  agent: AGENT, actionClass: CLS, state: 'merged', stateLabel: 'merged', startedAt: ago(2), finishedAt: ago(1), mrIid: iid,
  detail: edited === undefined ? {} : { edited },
});
const ledgerMerge = (iid: number): CountedEvent => ({ agent: AGENT, action_class: CLS, kind: 'merged', at: ago(1).toISOString(), subject: { project_id: 1, type: 'mr', iid } });
const fifteen = (edited: (iid: number) => boolean | undefined = () => false) => Array.from({ length: 15 }, (_, i) => merged(301 + i, edited(301 + i)));
const count = (o: Partial<CounterSource>) =>
  countRecord({ tasks: [], events: [], revertDemotes: true, ledgerRead: true, ...o }, { agent: AGENT, classId: CLS, since: ago(20), window: null }, NOW).noEdit;

describe('noEdit: merged outputs with no edit / merged outputs', () => {
  it('15 merged, none edited: 1', () => expect(count({ tasks: fifteen() })).toBe(1));
  it('one edited: 14/15', () => expect(count({ tasks: fifteen((iid) => iid === 305) })).toBe(14 / 15));
  it('a merged output whose row states no fact (indexed before it was read, or its notes not read): null', () => {
    expect(count({ tasks: fifteen((iid) => (iid === 305 ? undefined : false)) })).toBeNull();
  });
  it('a merge known only from a ledger merged event: null', () => {
    expect(count({ tasks: fifteen(), events: [ledgerMerge(399)] })).toBeNull();
    expect(count({ tasks: fifteen(), events: [ledgerMerge(301)] })).toBe(1); // the same MR as a row that states it
  });
  it('no merged output: null, never a ratio of nothing', () => expect(count({})).toBeNull());
  it('a reverted merge is not a merged output in the ratio', () => {
    const reverted: CountedTask = { ...merged(316), state: 'reverted' };
    expect(count({ tasks: [...fifteen(), reverted] })).toBe(1);
  });
});

// Every note below is synthetic: written from GitLab's source (SystemNotes::CommitService#add_commits), never recorded
// from a run. A recorded real push note is the operator's to add (V-204); none here stands in for one.
const sys = (author: string, body: string, at = '2026-10-06T11:00:00Z'): GlNote => ({ id: 2, body, author, system: true, createdAt: at });
const push = (author: string, at: string, body = 'added 1 commit\n\n<ul><li>abc12345 - fix</li></ul>'): GlNote => ({ id: 1, body, author, system: true, createdAt: at });
const mr = (o: Partial<GlMergeRequest> = {}): GlMergeRequest => ({
  id: 507, iid: 7, projectId: 1, title: 'fix', description: `Belay-Task: 01JQA7\nBelay-Class: ${CLS}`, state: 'merged', draft: false,
  sourceBranch: 'fix', targetBranch: 'main', author: AGENT, labels: [], webUrl: '', sha: 'a'.repeat(40), mergeStatus: null,
  createdAt: '2026-10-06T10:00:00Z', updatedAt: '2026-10-06T12:00:00Z', mergedAt: '2026-10-06T12:00:00Z', headPipelineId: null, ...o,
});
const derive = (m: GlMergeRequest, notes: GlNote[]) => deriveTask({ mr: m, notes, deployments: [] }, 'ledgerline', cfg(), () => 4)?.task.detail;

describe('the edited fact on the task row', () => {
  it('reads GitLab\'s push note: "added N commit(s)", system, by the pusher; a person\'s comment is not one', () => {
    expect(isPushNote(push('x', NOW.toISOString(), 'added 3 commits\n\n<ul>…</ul>'))).toBe(true);
    expect(isPushNote({ system: false, body: 'added 1 commit' })).toBe(false);
    expect(isPushNote({ system: true, body: 'added label ~"proof::pass"' })).toBe(false);
  });
  it('false when only the agent pushed (a force push or rebase of its own included); true for another account\'s push', () => {
    expect(derive(mr(), [push(AGENT, '2026-10-06T11:00:00Z')])?.edited).toBe(false);
    expect(derive(mr(), [])?.edited).toBe(false);
    expect(derive(mr(), [push(AGENT, '2026-10-06T10:30:00Z'), push('mariam', '2026-10-06T11:00:00Z')])?.edited).toBe(true);
  });
  it('a push after the merge is not an edit before it', () => {
    expect(editedBefore([push('mariam', '2026-10-06T12:30:00Z')], AGENT, '2026-10-06T12:00:00Z')).toBe(false);
  });
  it('absent on a merge request that has not merged', () => {
    expect(derive(mr({ state: 'opened', mergedAt: null }), [push('mariam', '2026-10-06T11:00:00Z')])).not.toHaveProperty('edited');
  });
});

describe('fails closed: a push-related note the recogniser does not know reads unknown, never unedited', () => {
  const MERGED = '2026-10-06T12:00:00Z';
  it("another account's system note that mentions a commit or a push, in a shape not recognised: no stated fact", () => {
    expect(editedBefore([sys('mariam', 'pushed 2 new commits to fix')], AGENT, MERGED)).toBeNull();
    expect(editedBefore([sys('mariam', 'force-pushed the branch')], AGENT, MERGED)).toBeNull();
    expect(derive(mr(), [push(AGENT, '2026-10-06T10:30:00Z'), sys('mariam', 'committed 1 change')])).not.toHaveProperty('edited');
  });
  it('so the ratio reads not recorded, and no Hands-off ask can open on it', () => {
    const unknown = (iid: number) => (iid === 305 ? undefined : false);
    expect(count({ tasks: fifteen(unknown) })).toBeNull();
  });
  it('"force-pushed" is not a push note shape: GitLab writes none (SystemNotes::CommitService writes "added N commit(s)")', () => {
    expect(isPushNote({ system: true, body: 'force-pushed the branch' })).toBe(false);
  });
  it('a recognised push by another account is still an edit, whatever else the notes hold', () => {
    expect(editedBefore([sys('bot', 'pushed 1 commit'), push('mariam', '2026-10-06T11:30:00Z')], AGENT, MERGED)).toBe(true);
  });
  it("unedited only when the notes support it: the agent's own notes, a cross-reference, a note after the merge", () => {
    expect(editedBefore([sys(AGENT, 'pushed 2 new commits to fix')], AGENT, MERGED)).toBe(false);
    expect(editedBefore([sys('mariam', 'mentioned in commit abc12345')], AGENT, MERGED)).toBe(false);
    expect(editedBefore([sys('mariam', 'pushed 1 commit', '2026-10-06T12:30:00Z')], AGENT, MERGED)).toBe(false);
    expect(editedBefore([sys('mariam', 'approved this merge request'), { ...sys('mariam', 'I pushed a commit'), system: false }], AGENT, MERGED)).toBe(false);
  });
});
