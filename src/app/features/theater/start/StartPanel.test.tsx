// The pre-run panel's states, rendered to markup: no repos, the hosted replay, propose (branch and caps disabled, and
// why), execute on a new branch, execute on an existing one (a checked-out branch listed disabled, with where), a
// refusal with its reason, and a preview with the server's exact command. The round trip itself is mocked: nothing runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import type { StartData } from '@/server/actions/runs/start/types';
import type { StartForm } from './model/form';
import type { StartRound } from './useStartRun';

const round = vi.hoisted(() => ({ current: { asking: false, sending: false, started: false, ask: () => {}, send: () => {} } as StartRound }));
vi.mock('./useStartRun', () => ({ useStartRun: () => round.current, LIVE_HREF: '/theater?live=1' }));
const { StartPanel } = await import('./StartPanel');
const { StartFields } = await import('./StartFields');
const { formFor } = await import('./model/form');

const repo = { slug: 'grinex-portal', path: 'C:/Users/mkdol/refactoring', base: 'initial/refactoring' };
const data: StartData = {
  repos: [repo],
  branches: { 'grinex-portal': { ok: true, head: 'master', branches: [{ name: 'feature/free' }, { name: 'master', checkedOutAt: 'C:/Users/mkdol/refactoring' }] } },
};
const listed = [{ name: 'feature/free' }, { name: 'master', checkedOutAt: 'C:/Users/mkdol/refactoring' }];
const fields = (patch: Partial<StartForm>) =>
  renderToStaticMarkup(<StartFields f={{ ...formFor(repo), ...patch }} set={() => {}} repos={data.repos} repo={repo} branches={listed} locked={false} />);
/** The markup of each fieldset that is disabled. */
const disabledSets = (html: string): string[] => [...html.matchAll(/<fieldset[^>]*disabled=""[^>]*>[\s\S]*?<\/fieldset>/g)].map((m) => m[0]);

describe('StartPanel', () => {
  it('no repos: says how to get one, and the fleet error', () => {
    const out = renderToStaticMarkup(<StartPanel data={{ repos: [], branches: {}, fleetError: 'repos[0]: slug must be a lowercase token' }} />);
    expect(out).toContain('No fleet repo to run on: repos[0]: slug must be a lowercase token');
    expect(out).not.toContain('Start run');
  });
  it('the hosted replay: closed, with why', () => {
    expect(renderToStaticMarkup(<StartPanel data={{ repos: [], branches: {}, closed: 'the hosted replay starts no run' }} />)).toContain('No run starts here: the hosted replay starts no run.');
  });
  it('opens on propose for the first repo; Start run is off until a preview', () => {
    round.current = { ...round.current, view: undefined };
    const out = renderToStaticMarkup(<StartPanel data={data} />);
    expect(out).toContain('plans the lanes, changes nothing');
    expect(out).toContain('lanes edit, run the gates, commit what passes');
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Start run<\/button>/);
    expect(out).toContain('nothing runs until Start run');
  });
  it('a refusal is shown with its reason', () => {
    round.current = { ...round.current, view: { kind: 'refused', reason: 'a belay run (pid 7) is running on grinex-portal now' } };
    expect(renderToStaticMarkup(<StartPanel data={data} />)).toContain('Not started: a belay run (pid 7) is running on grinex-portal now. Nothing ran.');
  });
  it("a preview shows the server's exact command and its notes, and Start run is on", () => {
    const preview = { kind: 'start-run', title: 'Propose · grinex-portal', summary: 'Plans the lanes and changes nothing.', risk: 'low', diff: [], previewId: 'p'.repeat(64), mode: 'live', notes: ['It will not run setup.'], commands: [{ display: 'belay run --repo grinex-portal --mode propose --waves 1 --lanes 6 --model sonnet', argv: [], risk: 'low' }] } as ActionPreview;
    round.current = { ...round.current, view: { kind: 'preview', preview } };
    const out = renderToStaticMarkup(<StartPanel data={data} />);
    expect(out).toContain('belay run --repo grinex-portal --mode propose --waves 1 --lanes 6 --model sonnet');
    expect(out).toContain('It will not run setup.');
    expect(out).not.toMatch(/<button[^>]*disabled=""[^>]*>Start run<\/button>/);
  });
});

describe('StartFields', () => {
  it('propose: the branch and caps are disabled, and say why', () => {
    const out = fields({ mode: 'propose' });
    const off = disabledSets(out);
    expect(off).toHaveLength(2);
    expect(off[0]).toContain('Branch');
    expect(off[1]).toContain('Lane cap in USD');
    expect(out).toContain('propose changes nothing');
  });
  it('execute on a new branch: from the fleet base by default, the local branches offered', () => {
    const out = fields({ mode: 'execute' });
    expect(disabledSets(out)).toEqual([]);
    expect(out).toContain('initial/refactoring (fleet base)');
    expect(out).toContain('<option value="feature/free">feature/free</option>');
    expect(out).toContain('Wave cap in USD');
  });
  it('execute on an existing branch: a checked-out branch is listed disabled, with where', () => {
    const out = fields({ mode: 'execute', branch: 'existing' });
    expect(out).toContain('aria-label="Existing branch"');
    expect(out).toMatch(/<option value="master" disabled="">master \(checked out at C:\/Users\/mkdol\/refactoring\)<\/option>/);
    expect(out).toMatch(/<option value="feature\/free">feature\/free<\/option>/);
    expect(out).toContain('lanes commit straight onto it');
  });
  it('a failed branch read says why', () => {
    const out = renderToStaticMarkup(<StartFields f={{ ...formFor(repo), mode: 'execute' }} set={() => {}} repos={data.repos} repo={repo} branches={[]} branchReason="git for-each-ref failed: not a git repository" locked={false} />);
    expect(out).toContain('No branches: git for-each-ref failed: not a git repository');
  });
});
