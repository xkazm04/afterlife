import { describe, expect, it } from 'vitest';
import type { Track } from '@/lib/demo';
import type { ClassRow, TrackMap } from '../types';
import { dockModel } from './dock';

const row = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: null, lastMove: '', pending: null, ...o,
});
const byId = { a: row('a'), q: row('q', { tier: 'quarantined' }), h: row('h', { tier: 'human_only', ceiling: 'human_only' }) };
const tracks = { T1: { id: 'T1', key: 'patcher' } as unknown as Track } as TrackMap;

describe('dockModel', () => {
  it('previews the one-step revoke by default', () => {
    const d = dockModel('a', byId, tracks, null);
    expect(d).toMatchObject({ kind: 'write', id: 'a', to: 'supervised', previewing: false });
    expect(d.kind === 'write' && d.msg).toBe('demote a: hands_off -> supervised (manual revoke)');
  });
  it('previews the highlighted menu target instead', () => {
    const d = dockModel('a', byId, tracks, 'quarantined');
    expect(d).toMatchObject({ kind: 'write', to: 'quarantined', previewing: true });
  });
  it('ignores a hover target the class cannot go to', () => {
    expect(dockModel('a', byId, tracks, 'hands_off')).toMatchObject({ to: 'supervised', previewing: true });
  });
  it('says why there is nothing to revoke', () => {
    expect(dockModel('q', byId, tracks, null)).toEqual({ kind: 'idle', id: 'q', reason: 'already read and comment only' });
    expect(dockModel('h', byId, tracks, null)).toMatchObject({ kind: 'idle', reason: 'never an agent' });
  });
  it('names a selected group and handles no selection', () => {
    expect(dockModel('g:T1', byId, tracks, null)).toEqual({ kind: 'group', id: 'T1', key: 'patcher' });
    expect(dockModel(null, byId, tracks, null)).toEqual({ kind: 'none' });
    expect(dockModel('zz', byId, tracks, null)).toEqual({ kind: 'none' });
  });
});
