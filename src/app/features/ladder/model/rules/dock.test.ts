import { describe, expect, it } from 'vitest';
import type { Track } from '@/lib/demo';
import type { ActionPreview } from '@/server/actions/types';
import type { WriteView } from '../../write/revoke';
import type { ClassRow, Tier, TrackMap } from '../types';
import { commandHead, dockModel } from './dock';

const row = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: null, lastMove: '', pending: null, ...o,
});
const byId = { a: row('a'), q: row('q', { tier: 'quarantined' }), h: row('h', { tier: 'human_only', ceiling: 'human_only' }) };
const tracks = { T1: { id: 'T1', key: 'patcher' } as unknown as Track } as TrackMap;
const preview = { previewId: 'p1', commands: [{ display: 'glab api --method PUT x -f branch=main', argv: [], risk: 'policy' }] } as unknown as ActionPreview;
const views: Record<string, WriteView> = { 'a>supervised': { kind: 'preview', preview } };
const viewOf = (id: string, to: Tier) => views[`${id}>${to}`];

describe('dockModel', () => {
  it('shows the one-step revoke by default, with the write the server planned for it', () => {
    const d = dockModel('a', byId, tracks, null, viewOf);
    expect(d).toMatchObject({ kind: 'write', id: 'a', to: 'supervised', previewing: false, view: { kind: 'preview', preview } });
  });
  it('previews the highlighted menu target instead, still being asked for', () => {
    const d = dockModel('a', byId, tracks, 'quarantined', viewOf);
    expect(d).toMatchObject({ kind: 'write', to: 'quarantined', previewing: true });
    expect(d.kind === 'write' && d.view).toBeUndefined();
  });
  it('ignores a hover target the class cannot go to', () => {
    expect(dockModel('a', byId, tracks, 'hands_off', viewOf)).toMatchObject({ to: 'supervised', previewing: true });
  });
  it('says why there is nothing to revoke', () => {
    expect(dockModel('q', byId, tracks, null, viewOf)).toEqual({ kind: 'idle', id: 'q', reason: 'already read and comment only' });
    expect(dockModel('h', byId, tracks, null, viewOf)).toMatchObject({ kind: 'idle', reason: 'never an agent' });
  });
  it('names a selected group and handles no selection', () => {
    expect(dockModel('g:T1', byId, tracks, null, viewOf)).toEqual({ kind: 'group', id: 'T1', key: 'patcher' });
    expect(dockModel(null, byId, tracks, null, viewOf)).toEqual({ kind: 'none' });
    expect(dockModel('zz', byId, tracks, null, viewOf)).toEqual({ kind: 'none' });
  });
});

describe('commandHead', () => {
  it('cuts a command at its first field, and leaves a short one whole', () => {
    expect(commandHead("glab api --method PUT projects/9/repository/files/tier-state.yml -f branch=main -f content='a'")).toBe('glab api --method PUT projects/9/repository/files/tier-state.yml …');
    expect(commandHead('glab api user')).toBe('glab api user');
  });
});
