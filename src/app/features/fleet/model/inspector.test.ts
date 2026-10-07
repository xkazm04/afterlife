import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { acceptedLabel, classTip, decideLabel, feedRows, fleetTask, gitlabUrl, needsMeta, recordLabel, taskVerdict, verdictMark, waitingTitle } from './inspector';
import { makeProject } from './testProject';
import type { DeepProject } from './types';

const cls = (id: string) => DEMO.actionClasses.find((c) => c.id === id);
const deep: DeepProject = {
  id: 'ledgerline', needs: DEMO.needsYou, actionClasses: {}, tasks: [], tracks: [], running: '8 of 8', webhooks: 'off (local)', unattributed: 4,
};

describe('class records', () => {
  it('writes accepted / needed and the lease', () => {
    expect(recordLabel(cls('dep-bump.patch'))).toBe('16/15 · 9 d');
    expect(recordLabel(cls('report.draft'))).toBe('4/3');
    expect(acceptedLabel(cls('dep-bump.patch'))).toBe('16/15 accepted');
  });
  it('is empty without a record', () => {
    expect(recordLabel(cls('report.submit'))).toBe('');
    expect(recordLabel(undefined)).toBe('');
    expect(acceptedLabel(undefined)).toBe('');
  });
  it('tips the last move and a ceiling below the tier', () => {
    expect(classTip(cls('dep-bump.patch'))).toBe('promoted 5 d ago');
    expect(classTip(cls('qa.file-bug'))).toBe('record 9 / 15 · not eligible · ceiling Hands-off');
    expect(classTip(cls('patch-bump'))).toBe('4 min ago · tripwire · ceiling Supervised');
    expect(classTip(undefined)).toBe('');
  });
});

describe('needsMeta', () => {
  const byId = (id: string) => DEMO.needsYou.find((n) => n.id === id)!;
  it('writes the tier move, the due time, the reason and the gap count', () => {
    expect(needsMeta(byId('n1'))).toBe('S → H');
    expect(needsMeta(byId('n2'))).toBe('due in 19 h 12 m');
    expect(needsMeta(byId('n3'))).toBe('2 gaps');
    expect(needsMeta(byId('n4'))).toBe('guardrail high severity on !44');
    expect(needsMeta(byId('n5'))).toBe('');
  });
});

describe('feedRows', () => {
  it('reports a healthy feed', () => {
    const rows = feedRows(makeProject({ id: 'a', feed: { ageSec: 2400, ok: true } }), null);
    expect(rows).toEqual([{ label: 'Last poll', value: '40 m ago' }, { label: 'Status', value: 'ok' }]);
  });
  it('flags a failing feed and never invents a status for an unknown one', () => {
    expect(feedRows(makeProject({ id: 'a', feed: { ageSec: 5400, ok: false, error: 'token expired' } }), null)[1]).toEqual({ label: 'Status', value: 'token expired', bad: true });
    const unknown = feedRows(makeProject({ id: 'a', feed: { ageSec: null, ok: null } }), null);
    expect(unknown).toEqual([{ label: 'Last poll', value: 'never' }, { label: 'Status', value: null }]);
  });
  it('adds environments, CRA and the deep project webhooks', () => {
    const p = makeProject({ id: 'ledgerline', env: { staging: 'rev 1', production: 'rev 2' }, craOpen: 1 });
    const labels = feedRows(p, deep).map((r) => r.label);
    expect(labels).toEqual(['Last poll', 'Status', 'Staging', 'Production', 'CRA open', 'Webhooks', 'Unattributed']);
    expect(feedRows(p, deep).filter((r) => r.cockpit).map((r) => r.label)).toEqual(['Webhooks', 'Unattributed']); // cockpit text: labelled demo in live mode
  });
});

describe('small words', () => {
  it('pluralises the waiting title and marks last known', () => {
    expect(waitingTitle(1, false)).toBe('1 decision waiting');
    expect(waitingTitle(3, true)).toBe('3 decisions waiting · last known');
  });
  it('marks a decision button that only opens the place to decide', () => {
    expect([decideLabel('Open policy MR'), decideLabel('Pick gaps…')]).toEqual(['Open policy MR…', 'Pick gaps…']);
  });
  it('builds the demo GitLab address', () => {
    expect(gitlabUrl('acme-lab/core/a')).toBe('gitlab.example/acme-lab/core/a');
  });
});

describe('tasks', () => {
  const task = (id: string) => DEMO.tasks.find((t) => t.id === id)!;
  it('lists a data-source task with its stored verdict, and a task with no proof has none', () => {
    expect(fleetTask(task('01J8Q4'))).toEqual({ id: '01J8Q4', title: 'Fix path traversal in statement export', mr: '!41', track: 'T1', state: 'merged · in production', verdict: 'PASS' });
    expect(fleetTask(task('01J8Q9')).verdict).toBeNull(); // blocked by the guardrail: no proof was posted
  });
  it('carries the stored word faithfully and never reads an odd one as a pass', () => {
    expect(['pass', 'FAIL', 'Inconclusive', 'passed', ''].map(taskVerdict)).toEqual(['PASS', 'FAIL', 'INCONCLUSIVE', 'UNKNOWN', 'UNKNOWN']);
  });
  it('draws only PASS as a tick and only FAIL as a cross; no proof is a dash, never a pass', () => {
    expect([verdictMark('PASS').glyph, verdictMark('FAIL').glyph, verdictMark('INCONCLUSIVE').glyph, verdictMark('UNKNOWN').glyph]).toEqual(['✓', '✗', '?', '?']);
    expect(verdictMark(null)).toEqual({ glyph: '–', word: 'no proof', tone: 'none' });
  });
});
