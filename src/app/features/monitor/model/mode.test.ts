import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { repollMessage as fleetRepollMessage } from '@/app/features/fleet/model/needs';
import { ageLine, NO_GOOD_POLL, notWatchedMessage, polledAge, rejectedMessage, repollMessage, repollPlan, repollingMessage, simulateRepoll } from './mode';

const proj = (o: Partial<FleetProject>): FleetProject => ({ id: 'p', name: 'ledgerline', state: 'watching', feed: { ageSec: 12, ok: true }, ...o }) as FleetProject;
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
  it('an empty reason says "no answer", as Fleet does, never a bare trailing dot', () => {
    expect(repollMessage('ledgerline', { ok: false, reason: '' })).toBe(fleetRepollMessage('ledgerline', { ok: false, reason: '' }));
    expect(repollMessage('ledgerline', { ok: false, reason: '' })).toBe('Re-poll failed · ledgerline · no answer');
    expect(rejectedMessage('ledgerline', new Error(''))).toBe('Re-poll failed · ledgerline · no answer');
    expect(simulateRepoll(proj({ feed: { ageSec: 60, ok: false, error: '' } })).message).toContain('Re-poll failed · ledgerline · no answer ·');
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
