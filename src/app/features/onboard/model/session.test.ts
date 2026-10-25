import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { planBatch, runBatch } from './batch';
import { initialRuns, type OnboardData } from './build';
import { changedRuns, decodeSession, loadSession, mergeSession, saveSession, sessionKey, type SessionStore } from './session';

const data: OnboardData = {
  org: 'acme-lab', host: 'gitlab.com', groups: DEMO.fleet.groups, projects: DEMO.fleet.projects, cycling: ['ledgerline'], asOf: '14:22',
};
const start = initialRuns(data);
const memory = (): SessionStore & { kept: Map<string, string> } => {
  const kept = new Map<string, string>();
  return { kept, read: (k) => kept.get(k) ?? null, write: (k, v) => void kept.set(k, v) };
};

/** One batch run with every write confirmed, as the server would under the MR it names. */
function afterOneBatch() {
  const batch = planBatch(data.projects, start, 5, data.org);
  const opened = Object.fromEntries(batch.writes.map((id, i) => [id, { mr: `!${100 + i}`, branch: 'belay/bootstrap' }]));
  return { batch, runs: runBatch(start, batch, data.projects, data.org, opened) };
}

describe('the Onboard session across a reload', () => {
  it('keeps only what the session moved, and a remount plans no write it already sent', () => {
    const { batch, runs } = afterOneBatch();
    expect(batch.writes.length).toBeGreaterThan(0);
    const store = memory();
    const changed = changedRuns(start, runs);
    expect(Object.keys(changed).sort()).toEqual([...batch.reads, ...batch.writes].sort());
    expect(saveSession(store, data.org, changed)).toBe(true);
    expect([...store.kept.keys()]).toEqual([sessionKey('acme-lab')]);

    const back = mergeSession(initialRuns(data), loadSession(store, data.org));
    expect(back).toEqual(runs);
    const sent = batch.writes[0]!;
    expect(back[sent]).toMatchObject({ waiting: 'merge', mr: '!100' });
    expect(planBatch(data.projects, back, 5, data.org).writes).not.toContain(sent);
  });

  it('a project the data now shows further along takes the data, and an unlisted one is dropped', () => {
    const { runs } = afterOneBatch();
    const kept = changedRuns(start, runs);
    const [id] = Object.keys(kept);
    const further = { ...start, [id!]: { step: 'cycling' as const, waiting: null, mr: null } };
    const out = mergeSession(further, { ...kept, gone: { step: 'paired', waiting: null, mr: null } });
    expect(out[id!]).toEqual(further[id!]);
    expect('gone' in out).toBe(false);
  });

  it('a blocked, empty or garbled store is no session, and a refused write says so', () => {
    const blocked: SessionStore = { read: () => { throw new Error('blocked'); }, write: () => { throw new Error('full'); } };
    expect(loadSession(blocked, 'acme-lab')).toEqual({});
    expect(saveSession(blocked, 'acme-lab', {})).toBe(false);
    expect(decodeSession(null)).toEqual({});
    expect(decodeSession('{not json')).toEqual({});
    expect(decodeSession(JSON.stringify({ v: 2, runs: {} }))).toEqual({});
    const mixed = { v: 1, runs: { a: { step: 'paired', waiting: null, mr: null }, b: { step: 'nowhere', waiting: null, mr: null } } };
    expect(decodeSession(JSON.stringify(mixed))).toEqual({ a: { step: 'paired', waiting: null, mr: null } });
  });
});
