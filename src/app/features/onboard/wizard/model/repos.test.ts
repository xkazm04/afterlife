import { describe, expect, it } from 'vitest';
import { reposNote, reposOf } from './repos';

const ROW = { root: 'C:/x/a', name: 'a', lastUsed: '2026-10-25T08:56:00.000Z', hostKind: 'none' as const };

describe('"Your repos" from the repos slice', () => {
  it('unread: no rows at all (a dash), never an empty history', () => {
    expect(reposOf({ state: 'unread' })).toEqual({});
  });
  it('read: the rows, and the note when the listing failed', () => {
    expect(reposOf({ state: 'ok', data: { repos: [ROW] } })).toEqual({ repos: [ROW] });
    expect(reposOf({ state: 'ok', data: { repos: [], note: reposNote.failed('EACCES') } }).note).toContain('EACCES');
  });
  it('a request not addressed to this machine says onboarding runs on your own machine', () => {
    expect(reposOf({ state: 'error', reason: 'not-local' })).toEqual({ repos: [], note: reposNote.notLocal });
    expect(reposOf({ state: 'error', reason: 'unreadable' }).note).toBe(reposNote.failed('unreadable'));
  });
});
