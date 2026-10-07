import { describe, expect, it } from 'vitest';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { ageLine, NO_GOOD_POLL, notWatchedMessage, polledAge, rejectedMessage, repollMessage, repollPlan, repollingMessage, resolveFor, simulateRepoll, visibleNeeds } from './mode';

const proj = (o: Partial<FleetProject>): FleetProject => ({ id: 'p', name: 'ledgerline', state: 'watching', feed: { ageSec: 12, ok: true }, ...o }) as FleetProject;
const need = (id: string) => ({ id }) as NeedsYouItem;

describe('visibleNeeds', () => {
  const needs = [need('seed-1'), need('real-1'), need('seed-2')];
  const isSeeded = (id: string) => id.startsWith('seed');
  it('live drops the demo seeded decisions', () => expect(visibleNeeds('live', needs, isSeeded).map((n) => n.id)).toEqual(['real-1']));
  it('demo keeps them all', () => expect(visibleNeeds('demo', needs, isSeeded)).toBe(needs));
});

describe('resolveFor', () => {
  it('demo simulates, live opens Needs you and claims nothing', () => {
    expect(resolveFor('demo')).toBe('simulate');
    expect(resolveFor('live')).toBe('open-needs-you');
  });
});

describe('repoll', () => {
  it('plans per mode; an unwatched project has nothing to poll in both', () => {
    expect(repollPlan('live', proj({}))).toBe('server');
    expect(repollPlan('demo', proj({}))).toBe('simulate');
    expect(repollPlan('live', proj({ state: 'not-set-up' }))).toBe('none');
    expect(repollPlan('demo', proj({ state: 'not-set-up' }))).toBe('none');
    expect(notWatchedMessage('ledgerline')).toBe('ledgerline: not watched, nothing to poll');
  });
  it('live says re-polling, then re-polled only on ok', () => {
    expect(repollingMessage('ledgerline')).toBe('Re-polling ledgerline…');
    expect(repollMessage('ledgerline', { ok: true })).toBe('Re-polled ledgerline');
  });
  it('live says a failure with its reason', () => expect(repollMessage('ledgerline', { ok: false, reason: 'not in the polled group' })).toBe('Re-poll failed · ledgerline · not in the polled group'));
  it('a rejected action fails with its message, or "no answer"', () => {
    expect(rejectedMessage('ledgerline', new Error('boom'))).toBe('Re-poll failed · ledgerline · boom');
    expect(rejectedMessage('ledgerline', 'x')).toBe('Re-poll failed · ledgerline · no answer');
  });
  it('demo simulates: a healthy feed resets, a broken one says why', () => {
    expect(simulateRepoll(proj({}))).toEqual({ message: 'Re-polled ledgerline', reset: true });
    const r = simulateRepoll(proj({ feed: { ageSec: 2820, ok: false, error: 'token expired' } }));
    expect(r.reset).toBe(false);
    expect(r.message).toContain('Re-poll failed · ledgerline · token expired');
  });
});

describe('the age line', () => {
  it('says there is no good poll yet for a null age, never a number', () => {
    expect(polledAge('live', null, 5)).toBeNull();
    expect(polledAge('demo', null, 5)).toBeNull();
    expect(ageLine(null)).toBe(NO_GOOD_POLL);
  });
  it('counts on from the row age', () => expect(ageLine(polledAge('live', 12, 3))).toBe('polled 15 s ago'));
  it('live never wraps; demo loops at 60', () => {
    expect(polledAge('live', 50, 30)).toBe(80);
    expect(polledAge('demo', 50, 30)).toBe(20);
  });
});
