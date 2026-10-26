import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { BatchTable } from './components/batch/BatchTable';
import { Funnel } from './components/funnel/Funnel';
import { Baseline } from './components/groups/Baseline';
import { GroupBars } from './components/groups/GroupBars';
import { ProjectPanel } from './components/inspector/ProjectPanel';
import { OnboardStatus } from './components/OnboardStatus';
import type { OnboardApi } from './hooks/useOnboard';
import { planBatch } from './model/batch';
import { initialRuns, type OnboardData } from './model/build';
import { baseline, byGroup, funnel } from './model/funnel';

const data: OnboardData = { org: 'acme-lab', host: 'gitlab.com', groups: DEMO.fleet.groups, projects: DEMO.fleet.projects, cycling: ['ledgerline'], asOf: '14:22' };
const runs = initialRuns(data);
const steps = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, v.step]));
const byId = new Map(data.projects.map((p) => [p.id, p]));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('Onboard parts render', () => {
  it('the funnel shows every step with its count', () => {
    const out = html(createElement(Funnel, { counts: funnel(steps), filter: null, onFilter: () => {} }));
    for (const n of ['184', '175', '166', '155']) expect(out).toContain(`>${n}<`);
  });
  it('the group bars and the baseline cover the whole estate', () => {
    expect(html(createElement(GroupBars, { groups: byGroup(data.projects, data.groups, steps), selectedGroup: null, onGroup: () => {} }))).toContain('core-banking');
    expect(html(createElement(Baseline, { rows: baseline(data.projects) }))).toContain('Weakest');
  });
  it('the batch table lists what only you can do apart, with a re-probe each', () => {
    const batch = planBatch(data.projects, runs, 5, 'acme-lab');
    const out = html(createElement(BatchTable, { batch, runs, byId, org: 'acme-lab', filter: null, selected: null, onSelect: () => {}, onResolve: () => {} }));
    expect(out).toContain('Only you');
    expect(out).toContain('I merged it: re-probe (simulated)');
    expect(out).toContain('Enroll T6: open cycle C1');
    expect(out).toContain('I finished the setup: re-probe (simulated)');
    expect(out).not.toContain('aria-selected');
    expect(html(createElement(BatchTable, { batch, runs, byId, org: 'acme-lab', filter: 'paired', selected: null, onSelect: () => {}, onResolve: () => {} }))).toContain(
      'Nothing sitting at paired here.',
    );
  });
  it('the status bar counts in words that agree with their number', () => {
    const o = (yours: number, reads: number, writes: number) =>
      ({ read: true, counts: funnel(steps), group: null, batch: { yours: Array(yours).fill('x'), reads: Array(reads).fill('x'), writes: Array(writes).fill('x') } }) as unknown as OnboardApi;
    expect(html(createElement(OnboardStatus, { o: o(1, 1, 1) }))).toContain('1 waits for you · next batch 1 read, 1 write');
    expect(html(createElement(OnboardStatus, { o: o(12, 9, 0) }))).toContain('12 wait for you · next batch 9 reads, 0 writes');
  });
  it('before the estate is read: every count a dash, never a zero and never an empty batch', () => {
    const unread = { read: false, counts: funnel({}), group: null, batch: { yours: [], reads: [], writes: [] } } as unknown as OnboardApi;
    expect(html(createElement(OnboardStatus, { o: unread }))).not.toMatch(/0/);
    const f = html(createElement(Funnel, { counts: funnel({}), filter: null, onFilter: () => {}, unread: true }));
    expect(f).toContain('Discovered');
    expect(f).not.toMatch(/>0</);
    const t = html(createElement(BatchTable, { batch: { yours: [], reads: [], writes: [] }, runs: {}, byId: new Map(), org: '', filter: null, selected: null, onSelect: () => {}, onResolve: () => {}, unread: true }));
    expect(t).not.toContain('Nothing here');
    expect(html(createElement(Baseline, { rows: baseline([]), unread: true }))).not.toContain('R?');
  });
  it('every project panel renders, unknown baselines included', () => {
    for (const p of data.projects) {
      const out = html(createElement(ProjectPanel, { p, run: runs[p.id]!, org: 'acme-lab', onResolve: () => {} }));
      expect(out).toContain(p.name);
      if (p.stages.every((s) => s == null)) expect(out).toContain('Unknown, never zero');
    }
    const scanned = data.projects.find((p) => p.state === 'not-set-up')!;
    const out = html(createElement(ProjectPanel, { p: scanned, run: { step: 'baselined', waiting: null, mr: null, simulated: true }, org: 'acme-lab', onResolve: () => {} }));
    expect(out).toContain('Scanned in this session (simulated)');
    const due = html(createElement(ProjectPanel, { p: scanned, run: { step: 'watching', waiting: null, mr: null }, org: 'acme-lab', onResolve: () => {} }));
    expect(due).toContain('Enroll T6: open cycle C1');
    expect(due).toContain('the server&#x27;s preview');
    expect(due).not.toContain('glab mr create');
  });
});
