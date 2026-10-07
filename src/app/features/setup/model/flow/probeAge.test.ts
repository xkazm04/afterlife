import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import { clockLabel, formatAgo, isStale, probeAgeText } from './probeAge';
import { createSetupState } from './state';
import { setupReducer } from './reducer';
import { STALE_AFTER_MS } from '../../data/timing';

const s0 = createSetupState(getSetup(), 0);

describe('probe age', () => {
  it('formats the demo clock from real minutes', () => {
    expect(clockLabel(14 * 60 + 2, 0, 0)).toBe('14:02');
    expect(clockLabel(14 * 60 + 2, 0, 59_999)).toBe('14:02');
    expect(clockLabel(14 * 60 + 2, 0, 60_000 * 59)).toBe('15:01');
  });
  it('formats an age as seconds, then minutes and seconds', () => {
    expect(formatAgo(0)).toBe('0 s ago');
    expect(formatAgo(59_400)).toBe('59 s ago');
    expect(formatAgo(125_000)).toBe('2 m 05 s ago');
    expect(formatAgo(-5)).toBe('0 s ago');
  });
  it('goes stale after two minutes, not before', () => {
    expect(isStale(s0, STALE_AFTER_MS)).toBe(false);
    expect(isStale(s0, STALE_AFTER_MS + 1)).toBe(true);
  });
  it('says "stale" with the age once stale, and shows the probe time', () => {
    expect(probeAgeText(s0, 5000)).toEqual({ text: 'belay doctor · probed 14:02 · 5 s ago', stale: false });
    expect(probeAgeText(s0, 130_000)).toEqual({ text: 'belay doctor · stale · probed 14:02 · 2 m 10 s ago', stale: true });
  });
  it('a failed probe reads as failed, with its time and age, never as a fresh probe, and is drawn amber', () => {
    const failed = { ...s0, doctorAt: 0, doctorProbedAt: '11:30', doctorError: 'belay doctor could not reach GitLab: network: timeout' };
    expect(probeAgeText(failed, 5000)).toEqual({ text: 'belay doctor · probe failed 11:30 · 5 s ago', stale: true });
    expect(probeAgeText(failed, 5000).text).not.toMatch(/probed 11:30/);
  });
  it('a never-probed group has no age and is not "stale"', () => {
    const s = setupReducer(s0, { t: 'pick-group', group: 'acme-sandbox', now: 1, at: '14:06' });
    expect(probeAgeText(s, 999_999)).toEqual({ text: 'belay doctor · acme-sandbox · never probed', stale: false });
  });
});
