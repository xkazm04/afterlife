import { describe, expect, it } from 'vitest';
import { DEMO, DERIVED, LIVE, LOGIN_FAILED, PASSED, input, through } from '../fixtures/input';
import { PROBE_IDLE } from '../stream';
import { currentOf, deriveSteps } from './derive';

const states = (i: Parameters<typeof deriveSteps>[0]) => Object.fromEntries(deriveSteps(i).map((s) => [s.key, s.state]));
const step = (i: Parameters<typeof deriveSteps>[0], k: string) => deriveSteps(i).find((s) => s.key === k)!;

describe('derived steps', () => {
  it('nothing probed: the repo waits for a person, the checks are not run yet, nothing is done', () => {
    const s = deriveSteps(input());
    expect(s.map((x) => x.key)).toEqual(['repo', 'glab', 'login', 'group', 'live', 'stack', 'save', 'unlock']);
    expect(states(input())).toMatchObject({ repo: 'you', glab: 'todo', login: 'todo', stack: 'todo', save: 'todo', unlock: 'todo' });
    expect(step(input(), 'glab').line).toBe('not checked yet: press Re-check');
    expect(currentOf(s)).toBe('repo');
  });

  it('probe running: glab and the login are checking, each with what it reads and the elapsed seconds', () => {
    const i = input({ probe: { state: { ...PROBE_IDLE, stage: 'preflight' }, running: true, sinceS: 4 } });
    expect(step(i, 'glab')).toMatchObject({ state: 'checking', checking: { what: 'glab', sinceS: 4, on: 'this machine' } });
    expect(step(i, 'login')).toMatchObject({ state: 'checking', line: 'checking glab login…', checking: { what: 'glab login', on: 'GitLab' } });
  });

  it('a node lights on its own event while the rest still check', () => {
    const i = input({ probe: { state: { ...PROBE_IDLE, stage: 'preflight', nodes: { glab: PASSED.nodes.glab! } }, running: true, sinceS: 2 } });
    expect([step(i, 'glab').state, step(i, 'login').state]).toEqual(['done', 'checking']);
  });

  it('blocked at login: its line is the doctor’s, Run it opens the login window, the group waits', () => {
    const i = input({ probe: { state: LOGIN_FAILED, running: false, sinceS: 0 } });
    expect(step(i, 'login')).toMatchObject({ state: 'blocked', line: 'glab is not logged in to gitlab.com', action: { kind: 'glab-login' }, commands: ['glab auth login'] });
    expect(step(i, 'login').action).toEqual({ kind: 'glab-login' });
    expect(step(i, 'group').state).toBe('todo');
  });

  it('group derived from the repo: the person sets it, live, with one confirm', () => {
    const i = input({ facts: DEMO, repo: { local: true, deriving: false, sinceS: 0, picked: 'C:/src/api', derive: { ...DERIVED, groupId: '777', host: 'gl.acme.io' } } });
    expect(step(i, 'repo')).toMatchObject({ state: 'done', line: 'acme/api on gl.acme.io' });
    expect(step(i, 'group')).toMatchObject({ state: 'you', line: 'acme is group 777: set it, live', action: { kind: 'set-setup', groupId: '777', mode: 'live', host: 'gl.acme.io' } });
    expect(step(i, 'live').state).toBe('todo');
    expect(currentOf(deriveSteps(i))).toBe('glab');
  });

  it('the env names another group: no set-setup over it, the step says to unset it', () => {
    const i = input({ facts: { ...LIVE, sources: { ...LIVE.sources, group: 'env' } }, repo: { local: true, deriving: false, sinceS: 0, picked: 'r', derive: { ...DERIVED, groupId: '9' } } });
    expect(step(i, 'group')).toMatchObject({ state: 'blocked', line: expect.stringMatching(/unset AFTERLIFE_GROUP_ID/) });
    expect(step(i, 'group').action).toBeUndefined();
  });

  it('live pass: every check before the stack is done, the stack waits for its proposal', () => {
    const i = through('pick', { tally: { saved: 0, total: 0, failed: 0 } });
    expect(states(i)).toMatchObject({ repo: 'done', glab: 'done', login: 'done', group: 'done', live: 'done', stack: 'todo' });
    expect(step(i, 'group').detail?.caps).toHaveLength(1);
    expect(currentOf(deriveSteps(i))).toBe('stack');
  });

  it('stack proposed and probing: checking on the model, then line by line on this machine', () => {
    expect(step(through('proposing', { elapsedS: 9 }), 'stack')).toMatchObject({ state: 'checking', checking: { what: 'the proposal', on: 'the model', sinceS: 9 } });
    expect(step(through('probing', { running: 2, tally: { saved: 2, total: 6, failed: 0 } }), 'stack')).toMatchObject({ state: 'checking', line: '2 of 6 confirmed so far', checking: { what: 'line 3 of 6' } });
    const review = through('review');
    expect([step(review, 'stack').state, step(review, 'save').state]).toEqual(['done', 'you']);
    expect(step(review, 'save').action).toEqual({ kind: 'save-project' });
  });

  it('saved: every step is done and the current one is the unlock map', () => {
    const s = deriveSteps(through('saved', { slug: 'acme-api' }));
    expect(s.every((x) => x.state === 'done')).toBe(true);
    expect(s.find((x) => x.key === 'save')?.line).toBe('saved as acme-api: Vitals collects from it');
    expect(currentOf(s)).toBe('unlock');
  });

  it('a saved project: its lines are read from its file, and both steps say when it was saved', () => {
    const s = deriveSteps(through('saved', { slug: 'acme-api', savedAt: '2026-10-21' }));
    expect(s.find((x) => x.key === 'stack')?.line).toBe('5 of 6 lines confirmed when it was saved, 2026-10-21');
    expect(s.find((x) => x.key === 'save')?.line).toBe('saved as acme-api on 2026-10-21: Vitals collects from it');
  });

  it('demo vs live: demo asks the person to switch to live; live before the first poll is checking', () => {
    const demo = { ...through('pick'), facts: { ...DEMO, groupSet: true } };
    expect(step(demo, 'live')).toMatchObject({ state: 'you', action: { kind: 'set-setup', mode: 'live', groupId: '144060371' } });
    const notReady = { ...through('pick'), facts: { ...LIVE, gate: 'not-ready' as const, reason: 'first poll not finished' }, probe: { state: { ...PASSED, nodes: { ...PASSED.nodes, live: { state: 'fail' as const, line: 'first poll not finished' } } }, running: false, sinceS: 0 } };
    expect(step(notReady, 'live')).toMatchObject({ state: 'checking', checking: { what: 'the first poll', on: 'Afterlife' } });
  });

  it('not local: the repo step is blocked with the reason, and the group step asks for the id', () => {
    const i = input({ facts: DEMO, repo: { local: false, note: 'open Afterlife on localhost', deriving: false, sinceS: 0 } });
    expect(step(i, 'repo')).toMatchObject({ state: 'blocked', line: 'open Afterlife on localhost' });
    expect(step(i, 'group')).toMatchObject({ state: 'you', input: 'group-id' });
  });
});
