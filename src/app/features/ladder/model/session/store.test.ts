import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadLadderData } from '../../data/loadLadderData';
import { initialState } from '../state/initial';
import { EMPTY_STORE, seedOf, storeReducer, type CoreSeed, type LadderStore, type LedgerPart } from './store';

afterEach(() => setDataSource(null));

function parts() {
  setDataSource(demoSource);
  const { seed } = loadLadderData();
  const { ledger, quotes, ...core } = seed;
  return { seed, core: core as CoreSeed, ledger: { ledger, quotes } as LedgerPart };
}

describe('the Ladder session store: slices landing', () => {
  it('nothing read: no class, no move', () => {
    expect(EMPTY_STORE.state.classes).toEqual([]);
    expect(EMPTY_STORE.core).toBeNull();
  });

  it('core then ledger is the opening state, the rows in their opening (last move) order', () => {
    const { seed, core, ledger } = parts();
    let st = storeReducer(EMPTY_STORE, { type: 'arriveCore', core });
    expect(st.state.classes.length).toBe(seed.classes.length);
    st = storeReducer(st, { type: 'arriveLedger', ledger });
    const open = initialState(seed);
    expect(st.state.order).toEqual(open.order);
    expect(st.state.ledger).toEqual(open.ledger);
  });

  it('ledger then core lands the same', () => {
    const { seed, core, ledger } = parts();
    const st = storeReducer(storeReducer(EMPTY_STORE, { type: 'arriveLedger', ledger }), { type: 'arriveCore', core });
    expect(st.state.order).toEqual(initialState(seed).order);
  });

  it('what the person set while unread survives the first read', () => {
    const { core } = parts();
    const typed = storeReducer(EMPTY_STORE, { type: 'query', q: 'patch' });
    expect(storeReducer(typed, { type: 'arriveCore', core }).state.q).toBe('patch');
  });

  it('a later read keeps the selection, the frozen order, a pending revoke and this session\'s own ledger lines', () => {
    const { core, ledger } = parts();
    let st: LadderStore = storeReducer(storeReducer(EMPTY_STORE, { type: 'arriveCore', core }), { type: 'arriveLedger', ledger });
    const id = st.state.classes[1]?.id ?? '';
    st = storeReducer(st, { type: 'select', id });
    st = storeReducer(st, { type: 'revoke', id, to: 'assisted', at: Date.parse('2026-10-26T10:00:00Z'), sent: { simulated: true } });
    const pendingRow = st.state.classes.find((c) => c.id === id);
    expect(pendingRow?.pending).toBeTruthy();
    const order = st.state.order;
    const own = st.state.ledger.at(-1);
    // the next read: the same classes (the server has not seen the commit yet) and one more server move
    const later: LedgerPart = { ...ledger, ledger: [...ledger.ledger, { at: 1, t: 'x', ids: [id], actor: 'tripwire job', where: 'GitLab', kind: 'gitlab', text: 'server move' }] };
    st = storeReducer(storeReducer(st, { type: 'arriveCore', core: structuredClone(core) }), { type: 'arriveLedger', ledger: later });
    expect(st.state.sel).toBe(id);
    expect(st.state.order).toEqual(order);
    expect(st.state.classes.find((c) => c.id === id)).toEqual(pendingRow);
    expect(st.state.ledger.some((e) => e.text === 'server move')).toBe(true);
    expect(st.state.ledger.at(-1)).toEqual(own);
  });

  it('a class the new read no longer holds leaves the order; a new one goes last', () => {
    const { core, ledger } = parts();
    const st = storeReducer(storeReducer(EMPTY_STORE, { type: 'arriveCore', core }), { type: 'arriveLedger', ledger });
    const [gone, ...rest] = core.classes;
    const extra = { ...(rest[0] ?? gone!), id: 'new.class' };
    const next = storeReducer(st, { type: 'arriveCore', core: { ...core, classes: [...rest, extra] } });
    expect(next.state.order).not.toContain(gone?.id);
    expect(next.state.order.at(-1)).toBe('new.class');
  });

  it('a reset goes back to the seed both reads make', () => {
    const { seed, core, ledger } = parts();
    const st = storeReducer(storeReducer(EMPTY_STORE, { type: 'arriveCore', core }), { type: 'arriveLedger', ledger });
    expect(seedOf(st.core, st.ledger)).toEqual(seed);
  });
});
