import { describe, expect, it } from 'vitest';
import { STAGES } from '@/schemas';
import { REPLAY_LEDGER } from '../../data/ledger';
import { demotionWord, deriveAnswers, needsIncreased } from './answers';
import { GROUND_LIFT, motionAt, pct } from './climb';
import { buildSnapshots } from './snapshots';
import { ageText, craLeft, secs } from './time';

const snaps = buildSnapshots(REPLAY_LEDGER, STAGES);
const at = (seq: number) => {
  const s = snaps[seq - 480];
  if (!s) throw new Error(`no snapshot ${seq}`);
  return s;
};

describe('clock helpers', () => {
  it('reads hh:mm:ss and counts the CRA clock down to 19 h 12 m at the end', () => {
    expect(secs('14:22:40')).toBe(51760);
    expect(craLeft('14:22:40')).toBe('19 h 12 m');
    expect(craLeft('14:00:06')).toBe('19 h 34 m');
  });
  it('words the age of the oldest waiting item', () => {
    expect(ageText('12:14:00', '14:00:06')).toBe('1 h');
    expect(ageText('14:20:05', '14:22:40')).toBe('3 min');
  });
});

describe('snapshots (a pure fold over the slice)', () => {
  it('starts on the ground with the dataset numbers', () => {
    const s = at(480);
    expect(s).toMatchObject({ beat: 0, pass: 30, fail: 1, dem: 0, stagesN: 6, board: false });
    expect(s.needs).toHaveLength(2);
    expect(s.needsAge).toBe('1 h');
  });
  it('counts a stage as evidence from rung 2: 6 -> 7 of 9 at seq 482', () => {
    expect(at(481).stagesN).toBe(6);
    expect(at(482).stagesN).toBe(7);
    expect(at(482).rungs.release).toBe(2);
    expect(at(520).stagesN).toBe(7);
  });
  it('collects the five proof checks in order', () => {
    expect(at(490).checks).toEqual([]);
    expect(at(495).checks).toEqual(['base-red', 'head-green', 'not-weakened', 'envelope', 'rescan']);
  });
  it('demotes patch-bump at seq 510 and adds the re-admit item', () => {
    expect(at(509).tiers['patch-bump']).toBe('supervised');
    expect(at(510).tiers['patch-bump']).toBe('quarantined');
    expect(at(510).droppedNow).toBe('patch-bump');
    expect(at(511).droppedNow).toBeNull();
    expect(at(510)).toMatchObject({ dem: 1, fail: 2, pass: 31 });
    expect(at(510).needs).toHaveLength(3);
    expect(at(520).tiers['dep-bump.patch']).toBe('hands_off');
  });
  it('shows the board from seq 519 and never before', () => {
    expect(at(518).board).toBe(false);
    expect(at(519).board).toBe(true);
  });
  it('does not mutate earlier snapshots', () => {
    expect(at(480).needs).toHaveLength(2);
    expect(at(480).rungs.release).toBe(1);
  });
});

describe('the four answers', () => {
  it('derives running, now, going well and needs me', () => {
    const a = deriveAnswers(at(510), 8, 8);
    expect(a.running).toEqual({ armed: 8, total: 8 });
    expect(a.now).toBe('T3 tripwire · patch-bump revoked');
    expect(a.well).toEqual({ pass: 31, fail: 2, demotions: 1 });
    expect(a.needs).toMatchObject({ count: 3, latest: 're-admit T8 patch-bump' });
    expect(demotionWord(1)).toBe('demotion');
    expect(demotionWord(0)).toBe('demotions');
  });
  it('pulses Needs me only when a waiting item is added', () => {
    expect(needsIncreased(at(509), at(510))).toBe(true);
    expect(needsIncreased(at(510), at(511))).toBe(false);
    expect(needsIncreased(at(511), at(510))).toBe(false);
    expect(needsIncreased(undefined, at(480))).toBe(false);
  });
});

describe('motion', () => {
  const m = (seq: number, p: number, reduced = false) => {
    const s = at(seq);
    return motionAt(s.e, s.beat, p, reduced);
  };
  it('keeps the !41 chip fully on the pane at beat 0 (the prototype clipped it)', () => {
    const g = m(480, 0);
    expect(g.c41).toBe(0);
    expect(g.lift).toBe(GROUND_LIFT);
    expect(g.pos).toBeLessThan(0);
    expect(m(481, 0).lift).toBe(0);
  });
  it('climbs a hold over the first 55% of the entry, then rests on it', () => {
    expect(m(485, 0).pos).toBe(0);
    expect(m(485, 0.55).pos).toBe(1);
    expect(m(485, 1).pos).toBe(1);
    expect(m(485, 0, true).pos).toBe(1);
    expect(m(514, 1).pos).toBe(7);
    expect(m(516, 1).c41).toBe(100);
  });
  it('!44 climbs, falls and is arrested at the guardrail', () => {
    expect(m(504, 1).show44).toBe(false);
    expect(m(505, 1).show44).toBe(true);
    expect(m(508, 1).y44).toBe(4.2);
    expect(m(509, 0).y44).toBe(4.2);
    expect(m(509, 1).y44).toBeCloseTo(3.7);
    expect(m(509, 0, true).y44).toBeCloseTo(3.7);
    expect(m(509, 1).caught).toBe(true);
    expect(m(508, 1).caught).toBe(false);
    expect(m(513, 1).y44).toBe(3.7);
  });
  it('rides the caption beside the climber of the scene and keeps it on the wall', () => {
    expect(m(480, 0).cap).toBeCloseTo(pct(0.4));
    expect(m(508, 1).cap).toBeCloseTo(pct(4.2));
    expect(m(516, 1).cap).toBeCloseTo(pct(7.2));
  });
});
