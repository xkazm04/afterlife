import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { gapBlock } from '../../write/desk';
import { initialState } from '../state';
import { reduce } from '../reducer';
import type { Action, NeedsState } from '../types';
import { rowAction, spaceAction } from './rowAction';
import { itemLede } from './lede';
import { rowView } from './rowData';
import { decisionCounts, isDecided, isGapId, isWaiting, rowState } from './rowState';

const demo = pickNeedsYouDemo();
const fresh = (): NeedsState => initialState(demo);
const with_ = (over: Partial<NeedsState>): NeedsState => ({ ...fresh(), ...over });

describe('row state', () => {
  it('opens with every decision waiting and the two picked gaps waiting, the others waiting for a pick', () => {
    const s = fresh();
    expect(rowState(s, 'n2')).toMatchObject({ tone: '', label: 'waiting' });
    expect(rowState(s, 'g1')).toMatchObject({ tone: '', label: 'picked' });
    expect(rowState(s, 'g3')).toMatchObject({ tone: 'dim', glyph: 'open', label: 'you pick' });
  });
  it('says "draft read" once the draft is read, and "ready to sign" once sent', () => {
    expect(rowState(with_({ read: { draft: true, note: false } }), 'n2').label).toBe('draft read');
    expect(rowState(with_({ status: { ...fresh().status, n2: 'sent' } }), 'n2')).toMatchObject({ tone: 'ok', label: 'ready to sign' });
    expect(rowState(with_({ status: { ...fresh().status, n2: 'sent' }, submitted: true }), 'n2').label).toBe('submitted');
  });
  it('draws an unseen runner as unknown (dashed), never as failed', () => {
    expect(rowState(with_({ runner: { opened: false, check: 'none' } }), 'n5')).toMatchObject({ tone: 'unk', glyph: 'unk', label: 'not seen' });
  });
  it('tells gap ids from decision ids', () => {
    expect(isGapId('g2')).toBe(true);
    expect(isGapId('g:improve')).toBe(false);
    expect(isGapId('n1')).toBe(false);
  });
});

describe('filters', () => {
  it('counts waiting, in outbox and decided', () => {
    expect(decisionCounts(fresh())).toEqual({ all: 8, waiting: 6, outbox: 0, decided: 0 });
    const staged = with_({ status: { ...fresh().status, n1: 'staged' } });
    expect(decisionCounts(staged)).toMatchObject({ waiting: 5, outbox: 1 });
  });
  it('a runner that was checked and not seen is still waiting: the Waiting filter and its count keep it', () => {
    const unseen = with_({ runner: { opened: false, check: 'none' } });
    expect(isWaiting(unseen, 'n5')).toBe(true);
    expect(isDecided(unseen, 'n5')).toBe(false);
    expect(decisionCounts(unseen)).toEqual(decisionCounts(fresh()));
  });
  it('a gap nobody acted on is not decided, but a set-aside decision is', () => {
    expect(isDecided(fresh(), 'g3')).toBe(false);
    expect(isDecided(with_({ status: { ...fresh().status, n1: 'snoozed' } }), 'n1')).toBe(true);
    expect(isWaiting(with_({ status: { ...fresh().status, n1: 'snoozed' } }), 'n1')).toBe(false);
  });
});

describe('the one action on each row', () => {
  it('forces reading before acting: Read draft, then Ready to sign', () => {
    expect(rowAction(fresh(), 'n2', demo)).toMatchObject({ label: 'Read draft', action: 'read-draft' });
    expect(rowAction(with_({ read: { draft: true, note: false } }), 'n2', demo)).toMatchObject({ label: 'Ready to sign', action: 'stage-n2' });
  });
  it('offers Read note before Re-admit', () => {
    expect(rowAction(fresh(), 'n4', demo)?.label).toBe('Read note');
    expect(rowAction(with_({ read: { draft: false, note: true } }), 'n4', demo)?.label).toBe('Re-admit');
  });
  it('lets a staged row be taken back, and a sent promotion be simulated as merged', () => {
    expect(rowAction(with_({ status: { ...fresh().status, n1: 'staged' } }), 'n1', demo)).toMatchObject({ label: 'Take back', action: 'unstage:n1' });
    expect(rowAction(with_({ status: { ...fresh().status, n1: 'sent' } }), 'n1', demo)?.label).toBe('Simulate merge');
    expect(rowAction(with_({ status: { ...fresh().status, n1: 'merged' } }), 'n1', demo)).toBeNull();
  });
  it('stops offering an action once the sign-off was submitted', () => {
    const sent = with_({ status: { ...fresh().status, n2: 'sent' } });
    expect(rowAction(sent, 'n2', demo)?.label).toBe('I submitted it');
    expect(rowAction({ ...sent, submitted: true }, 'n2', demo)).toBeNull();
  });
  it('offers Stage on a gap with a door and none on the probe (g4), the same rule as the inspector', () => {
    expect(rowAction(fresh(), 'g3', demo)).toMatchObject({ label: 'Stage', action: 'stage-gap:g3' });
    expect(gapBlock('g4', demo)).not.toBeNull();
    expect(rowAction(fresh(), 'g4', demo)).toBeNull();
    expect(rowAction(with_({ gapStatus: { g4: 'staged' } }), 'g4', demo)?.label).toBe('Take back');
  });
  it('Space ticks an unstaged gap and otherwise runs the row action', () => {
    expect(spaceAction(fresh(), 'g3', demo)).toBe('tick:g3');
    expect(spaceAction(with_({ gapStatus: { g3: 'staged' } }), 'g3', demo)).toBe('unstage:g3');
    expect(spaceAction(fresh(), 'n1', demo)).toBe('stage-n1');
    expect(spaceAction(fresh(), 'g:improve', demo)).toBeNull();
    expect(spaceAction(fresh(), 'h0', demo)).toBeNull();
  });
});

describe('row cells', () => {
  it('shows the live clock on the sign-off row and an opened-at time on the rest', () => {
    expect(rowView(fresh(), 'n2', { ...demo, signoff: { ...demo.signoff, linksResolved: '5 / 6' } })).toMatchObject({ move: { kind: 'grade', label: 'draft', done: false } });
    expect(rowView(fresh(), 'n2', demo)).toMatchObject({ due: true, seeded: true, track: 'T2', move: { kind: 'grade', label: 'reviewable', done: false } });
    expect(rowView(fresh(), 'n1', demo)).toMatchObject({ when: '13:40', move: { kind: 'tiers', from: 'supervised', to: 'hands_off' } });
  });
  it('writes nothing for a gap Afterlife has no door for (the probe sends nothing yet), a diff size otherwise', () => {
    expect(rowView(fresh(), 'g4', demo)?.writes).toEqual({ kind: 'none' });
    expect(itemLede(fresh(), 'g4', demo, 19 * 3600 + 12 * 60)).toContain('writes nothing');
    expect(rowView(fresh(), 'g1', demo)?.writes).toEqual({ kind: 'text', text: 'draft MR · 34 l' });
  });
  it('turns the runner chip from unknown to online after a check', () => {
    expect(rowView(fresh(), 'n5', demo)?.move).toMatchObject({ tone: 'unknown' });
    expect(rowView(with_({ runner: { opened: true, check: 'ok' } }), 'n5', demo)?.move).toMatchObject({ tone: 'ok', label: 'online' });
  });
  it('dates the unknown runner chip by the check the viewer just ran, not the seeded one', () => {
    expect(rowView(fresh(), 'n5', demo)?.move).toMatchObject({ title: 'Unknown · checked 2 h ago' });
    const checked = rowView(with_({ runner: { opened: false, check: 'none' } }), 'n5', demo)?.move;
    expect(checked).toMatchObject({ tone: 'unknown', title: 'Not seen · checked just now (simulated)' });
  });
});

describe('the ledger rows a decision records', () => {
  it('Not yet and Retire name the class the source holds, not one typed in', () => {
    const d = pickNeedsYouDemo();
    const other = { ...d, promote: { ...d.promote, cls: 'other.promoted' }, readmit: { ...d.readmit, cls: 'other.readmitted' } };
    const s = [{ type: 'act', action: 'snooze-n1' }, { type: 'act', action: 'retire-n4' }].reduce((acc, a) => reduce(acc, a as Action, other), initialState(other));
    expect(s.session.map((r) => r.what).join(' | ')).toContain('other.promoted');
    expect(s.session.map((r) => r.what).join(' | ')).toContain('other.readmitted');
  });
});
