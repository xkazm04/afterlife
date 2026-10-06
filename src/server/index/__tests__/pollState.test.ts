import { describe, expect, it } from 'vitest';
import {
  feedStatusOf, getPollState, projectSource, recordPollError, recordPollOk, staleSources,
} from '../repositories';
import { memoryIndex } from './memoryIndex';

const NOW = new Date('2026-10-06T14:22:00Z');
const ago = (sec: number): Date => new Date(NOW.getTime() - sec * 1000);

describe('feed status', () => {
  it('is unknown before the first poll, never zero', () => {
    expect(feedStatusOf(null, NOW)).toEqual({ ageSec: null, ok: null });
    expect(feedStatusOf({ source: 's', lastOk: null, lastError: null }, NOW)).toEqual({ ageSec: null, ok: null });
  });

  it('measures age from the last good poll', () => {
    expect(feedStatusOf({ source: 's', lastOk: ago(12), lastError: null }, NOW)).toEqual({ ageSec: 12, ok: true });
    expect(feedStatusOf({ source: 's', lastOk: ago(-5), lastError: null }, NOW).ageSec).toBe(0);
  });

  it('keeps the last good time when a poll fails, so a stale feed looks stale', () => {
    expect(feedStatusOf({ source: 's', lastOk: ago(2820), lastError: 'project token expired' }, NOW))
      .toEqual({ ageSec: 2820, ok: false, error: 'project token expired' });
    expect(feedStatusOf({ source: 's', lastOk: null, lastError: 'boom' }, NOW)).toEqual({ ageSec: null, ok: false, error: 'boom' });
  });
});

describe('poll_state', () => {
  it('records ok, then an error that keeps last_ok, then recovery that clears it', async () => {
    const db = await memoryIndex();
    const source = projectSource('ledgerline');
    expect(source).toBe('project:ledgerline');

    await recordPollOk(db, source, ago(300));
    await recordPollError(db, source, '401 unauthorized');
    expect(await getPollState(db, source)).toEqual({ source, lastOk: ago(300), lastError: '401 unauthorized' });

    await recordPollOk(db, source, ago(10));
    expect(await getPollState(db, source)).toEqual({ source, lastOk: ago(10), lastError: null });
    expect(await getPollState(db, 'project:none')).toBeNull();
  });

  it('lists the sources that are stale, failing or never succeeded', async () => {
    const db = await memoryIndex();
    await recordPollOk(db, 'project:fresh', ago(10));
    await recordPollOk(db, 'project:old', ago(7200));
    await recordPollOk(db, 'project:broken', ago(5));
    await recordPollError(db, 'project:broken', 'token expired');
    await recordPollError(db, 'project:never', 'no route');
    await recordPollOk(db, 'group:other', ago(99999));

    expect(await staleSources(db, NOW, 120, 'project:')).toEqual(['project:broken', 'project:never', 'project:old']);
    expect(await staleSources(db, NOW, 120)).toContain('group:other');
  });
});
