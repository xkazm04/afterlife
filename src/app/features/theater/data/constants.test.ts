// constants.ts keeps facts about the invented slice in prose and clock strings ("Fell 14:20:05", "Earned at seq 503",
// the CRA anchor, which take is the seeded one). The ledger beside it is the ground truth; these read it, not the copy.
import { describe, expect, it } from 'vitest';
import { CRA_END, INITIAL, SHOW_CLASSES, TAKES, TIER_WHY } from './constants';
import { REPLAY_LEDGER } from './ledger';

const tierEntry = (to: string) => REPLAY_LEDGER.find((e) => e.tier?.to === to);

describe('constants.ts against the ledger it narrates', () => {
  it('"Fell <time>" is the time of the entry that quarantines a class', () => {
    const fell = tierEntry('quarantined');
    expect(fell).toBeDefined();
    expect(TIER_WHY.quarantined).toContain(`Fell ${fell?.t}`);
  });

  it('"Earned at seq <n>" is the entry that promotes qa.file-bug to supervised', () => {
    const earned = REPLAY_LEDGER.find((e) => e.tier?.cls === 'qa.file-bug' && e.tier.to === 'supervised');
    expect(earned).toBeDefined();
    expect(TIER_WHY.bug).toContain(`seq ${earned?.seq}`);
  });

  it('the CRA clock is anchored at the last entry\'s time', () => {
    expect(CRA_END.at).toBe(REPLAY_LEDGER.at(-1)?.t);
  });

  it('a waiting item raised by an entry is waiting since that entry\'s own time', () => {
    const raised = REPLAY_LEDGER.filter((e) => e.need);
    expect(raised.length).toBeGreaterThan(0);
    for (const e of raised) expect(e.need?.since).toBe(e.t);
  });

  it('the Autonomy rows are exactly the classes the fold starts with', () => {
    expect(SHOW_CLASSES.map(([, cls]) => cls).sort()).toEqual(Object.keys(INITIAL.tiers).sort());
  });

  it('the one seeded take is the take that holds the !44 scene, and holds nothing else', () => {
    TAKES.forEach((t) => {
      const inside = REPLAY_LEDGER.filter((e) => e.seq >= t.a && e.seq <= t.b);
      expect(inside.length).toBeGreaterThan(0);
      expect(inside.every((e) => e.sc === 'm44')).toBe(t.seeded === true);
    });
    expect(REPLAY_LEDGER.filter((e) => e.sc === 'm44').length).toBe(
      TAKES.filter((t) => t.seeded).reduce((n, t) => n + (t.b - t.a + 1), 0),
    );
  });
});
