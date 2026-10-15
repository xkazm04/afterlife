import { describe, expect, it } from 'vitest';
import type { Track } from '@/lib/demo';
import type { ActionPreview } from '@/server/actions/types';
import type { PromoteView } from '../../write/promote';
import type { WriteView } from '../../write/revoke';
import type { ClassRow, Tier, TrackMap } from '../types';
import { commandHead, dockModel, type DockPromote } from './dock';
import type { PromoteAsk } from './promote';

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

describe('dockModel and the promotion', () => {
  const sent = { kind: 'sent' as const, mr: '!22', url: null, simulated: false };
  const promoViews: Record<string, PromoteView> = { 'a>hands_off': { kind: 'preview', preview }, 'q>assisted': sent };
  const promo = (want: PromoteAsk | null, pinned = false): DockPromote => ({ want, pinned, viewOf: (id, to) => promoViews[`${id}>${to}`] });
  const up: PromoteAsk = { id: 'a', to: 'hands_off', readmit: false };

  it('keeps the revoke on the strip until p pins the promotion', () => {
    expect(dockModel('a', byId, tracks, null, viewOf, promo(up))).toMatchObject({ kind: 'write', to: 'supervised' });
    expect(dockModel('a', byId, tracks, null, viewOf, promo(up, true))).toEqual({ kind: 'promote', id: 'a', to: 'hands_off', readmit: false, view: { kind: 'preview', preview } });
  });
  it('a hovered revoke target takes the strip back', () => {
    expect(dockModel('a', byId, tracks, 'quarantined', viewOf, promo(up, true))).toMatchObject({ kind: 'write', to: 'quarantined' });
  });
  it('a quarantine, with nothing to revoke, shows its re-admission at once, and the MR once sent', () => {
    expect(dockModel('q', byId, tracks, null, viewOf, promo({ id: 'q', to: 'assisted', readmit: true }))).toEqual({ kind: 'promote', id: 'q', to: 'assisted', readmit: true, view: sent });
  });
  it('a class the rule does not call eligible never shows a promotion', () => {
    expect(dockModel('a', byId, tracks, null, viewOf, promo(null, true))).toMatchObject({ kind: 'write' });
    expect(dockModel('h', byId, tracks, null, viewOf, promo(up, true))).toMatchObject({ kind: 'idle' });
  });
});

describe('commandHead', () => {
  it('cuts a command at its first field, and leaves a short one whole', () => {
    expect(commandHead("glab api --method PUT projects/9/repository/files/tier-state.yml -f branch=main -f content='a'")).toBe('glab api --method PUT projects/9/repository/files/tier-state.yml …');
    expect(commandHead('glab api user')).toBe('glab api user');
  });
});
