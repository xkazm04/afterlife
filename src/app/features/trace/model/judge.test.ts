import { describe, expect, it } from 'vitest';
import { firstOpen, judge, unprobed, type ProbeSeen } from './judge';
import { NODES } from './nodes';
import type { TraceFacts } from './types';

const facts: TraceFacts = { mode: 'live', fake: true, groupId: '144060371', groupSet: false, host: 'gitlab.com', gate: null, rehearsal: false, reason: null, projects: 184 };
const caps = [
  { id: 'a', label: 'a', status: 'available' as const, reason: '' },
  { id: 'b', label: 'b', status: 'unknown' as const, reason: '' },
];
const ok: ProbeSeen = { blocker: null, user: 'ops', group: { fullPath: 'acme-lab' }, projectCount: 184, caps };
const order = NODES.map((n) => n.key);

describe('judge', () => {
  it('passes the whole wire when every probe answers', () => {
    const n = judge(ok, facts);
    expect(order.map((k) => n[k].state)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    expect(n.doctor.line).toBe('1 available · 0 unavailable · 1 unknown');
  });
  it('fails glab on a binary blocker and makes the rest wait', () => {
    const n = judge({ ...ok, blocker: { kind: 'binary', text: 'glab cannot be started (ENOENT)' }, user: null }, facts);
    expect([n.glab.state, n.login.state, n.group.state, n.doctor.state]).toEqual(['fail', 'wait', 'wait', 'wait']);
    expect(firstOpen(n, order)).toBe('glab');
  });
  it('fails the login on an auth blocker, in the doctor’s words', () => {
    const n = judge({ ...ok, blocker: { kind: 'auth', text: 'glab is not logged in to gitlab.com' }, user: null }, facts);
    expect(n.login).toEqual({ state: 'fail', line: 'glab is not logged in to gitlab.com' });
    expect(firstOpen(n, order)).toBe('login');
  });
  it('never passes the doctor when the login did not answer', () => {
    const n = judge({ ...ok, user: null }, facts);
    expect([n.login.state, n.doctor.state, n.setup.state]).toEqual(['unknown', 'unknown', 'wait']);
  });
  it('fails the group on a group blocker or a group with no project', () => {
    expect(judge({ ...ok, blocker: { kind: 'group', text: 'group 1 cannot be read' } }, facts).group.state).toBe('fail');
    expect(judge({ ...ok, projectCount: 0 }, facts).group.line).toMatch(/0 projects/);
  });
  it('reads the live node from the server alone: demo waits, not ready fails', () => {
    expect(judge(ok, { ...facts, mode: 'demo' }).live.state).toBe('wait');
    expect(judge(ok, { ...facts, gate: 'not-ready', reason: 'first poll not finished' }).live).toEqual({ state: 'fail', line: 'first poll not finished' });
    expect(unprobed({ ...facts, gate: 'empty' }).live.state).toBe('fail');
  });
});
