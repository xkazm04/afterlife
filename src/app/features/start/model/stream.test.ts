import { describe, expect, it } from 'vitest';
import { PROBE_IDLE, eventOf, fold, splitLines } from './stream';

describe('the probe stream', () => {
  it('splits whole lines and keeps the partial one for the next chunk', () => {
    const a = splitLines('{"t":"stage","stage":"preflight"}\n{"t":"node","key":"glab","read":{"state":"pass","line":"ok"}}\n{"t":"no');
    expect(a.events.map((e) => e.t)).toEqual(['stage', 'node']);
    expect(a.rest).toBe('{"t":"no');
  });
  it('lights a node on its own event, before done', () => {
    const s = [eventOf('{"t":"stage","stage":"preflight"}'), eventOf('{"t":"node","key":"glab","read":{"state":"pass","line":"glab starts"}}')].reduce(fold, PROBE_IDLE);
    expect(s.stage).toBe('preflight');
    expect(s.nodes.glab?.state).toBe('pass');
    expect(s.nodes.login).toBeUndefined();
    expect(s.read).toBeNull();
  });
  it('keeps one row per capability, and a refusal ends the stream with its reason', () => {
    const row = { id: 'a', label: 'A', status: 'unknown' as const, reason: '' };
    const s = fold(fold(PROBE_IDLE, { t: 'cap', row }), { t: 'cap', row: { ...row, status: 'available' } });
    expect(s.caps).toEqual([{ ...row, status: 'available' }]);
    expect(fold(s, { t: 'refused', reason: 'not local' })).toMatchObject({ stage: 'done', refused: 'not local' });
  });
  it('says so when a line is not an event', () => {
    expect(eventOf('<html>')).toMatchObject({ t: 'refused', reason: expect.stringMatching(/not an event/) });
  });
});
