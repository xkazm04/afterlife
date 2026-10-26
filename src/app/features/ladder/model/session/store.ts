// The Ladder session's store: one state for the list and every class page (the screen host's Session), fed by the
// screens' slices as they land (screen/slices.ts): `core` (the classes, the head, the zone) and `ledger` (the moves and the
// guardrail's quotes). Pure. A later read merges into what the person did instead of wiping it: a class with a revoke
// still pending keeps its own row, this session's own ledger lines stay, the frozen order keeps its rows where they are.
import { seedLedger, initialState } from '../state/initial';
import { ladderReducer } from '../state/reducer';
import type { LadderAction, LadderSeed, LadderState } from '../state/state';
import type { ClassRow, LedgerEntry } from '../types';
import { computeOrder } from '../view/sort';

/** The core slice's seed part: the seed without the ledger. */
export type CoreSeed = Omit<LadderSeed, 'ledger' | 'quotes'>;
/** The ledger slice: the moves and the quotes they resolve. */
export type LedgerPart = Pick<LadderSeed, 'ledger' | 'quotes'>;

export interface LadderStore {
  /** The last core read (null: not read yet). */
  core: CoreSeed | null;
  /** The last ledger read (null: not read yet). */
  ledger: LedgerPart | null;
  state: LadderState;
}

export type StoreAction = LadderAction | { type: 'arriveCore'; core: CoreSeed } | { type: 'arriveLedger'; ledger: LedgerPart };

const NO_LEDGER: LedgerPart = { ledger: [], quotes: {} };
const EMPTY_SEED: LadderSeed = { classes: [], ...NO_LEDGER, head: { sha: '', by: '' }, tz: 'UTC' };

/** The seed both reads make (an unread ledger is empty): what a reset goes back to. */
export const seedOf = (core: CoreSeed | null, ledger: LedgerPart | null): LadderSeed => ({ ...EMPTY_SEED, ...(core ?? {}), ...(ledger ?? NO_LEDGER) });

/** Nothing read yet: no class, no move (the screens draw dashes, not "no classes"). */
export const EMPTY_STORE: LadderStore = { core: null, ledger: null, state: initialState(EMPTY_SEED) };

const keyOf = (e: Pick<LedgerEntry, 'at' | 'text'>): string => `${e.at}|${e.text}`;

/** The order kept: the rows already placed stay, a new class goes last, a gone one leaves. */
function keptOrder(order: readonly string[], classes: readonly ClassRow[]): string[] {
  const ids = new Set(classes.map((c) => c.id));
  const kept = order.filter((id) => ids.has(id));
  return [...kept, ...classes.map((c) => c.id).filter((id) => !kept.includes(id))];
}

function arriveCore(st: LadderStore, core: CoreSeed): LadderStore {
  const prev = st.state;
  if (!st.core) {
    // the first read: the opening state, keeping what the person set while it was unread (search, filters, grouping)
    const fresh = initialState(seedOf(core, st.ledger));
    const { q, filt, src, grouped, collapsed } = prev;
    return { ...st, core, state: { ...fresh, q, filt, src, grouped, collapsed } };
  }
  const local = new Map(prev.classes.map((c) => [c.id, c]));
  const classes: ClassRow[] = core.classes.map((c) => {
    const mine = local.get(c.id);
    if (mine?.pending) return mine;
    const row: ClassRow = { ...c, record: c.record ? { ...c.record } : null, pending: null };
    return mine?.simRead ? { ...row, simRead: mine.simRead } : row;
  });
  const pending = classes.some((c) => c.pending);
  return { ...st, core, state: { ...prev, classes, order: keptOrder(prev.order, classes), head: pending || prev.head.by === 'you' ? prev.head : { ...core.head }, tz: core.tz } };
}

function arriveLedger(st: LadderStore, part: LedgerPart): LadderStore {
  const prev = st.state;
  const server = seedLedger({ ...seedOf(st.core, part) });
  const before = new Set(seedLedger(seedOf(st.core, st.ledger)).map(keyOf));
  const now = new Set(server.map(keyOf));
  // this session's own lines (a revoke, a gate read it settled): in neither read, so they stay after the server's
  const own = prev.ledger.filter((e) => !before.has(keyOf(e)) && !now.has(keyOf(e)));
  const ledger = [...server, ...own];
  // the first ledger read orders the rows by last move (the opening sort needs it); later ones keep the frozen order
  const order = st.ledger ? prev.order : computeOrder(prev.classes, ledger, prev.sort);
  return { ...st, ledger: part, state: { ...prev, ledger, order } };
}

export function storeReducer(st: LadderStore, a: StoreAction): LadderStore {
  if (a.type === 'arriveCore') return arriveCore(st, a.core);
  if (a.type === 'arriveLedger') return arriveLedger(st, a.ledger);
  const state = ladderReducer(st.state, a);
  return state === st.state ? st : { ...st, state };
}
