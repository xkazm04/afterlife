// Who an entry names: the illustrative slice's actors by their caption names, a real event's agent as it is.
import { BY_SHORT, WHO } from '../../data/constants';
import type { Actor, LedgerEntry } from '../types';

/** Only the invented slice has actors; a real event (it carries `ev`) states its own agent and nothing more. */
type Named = Pick<LedgerEntry, 'by' | 'ev'>;

const isActor = (e: Named): e is Named & { by: Actor } => !e.ev && Object.hasOwn(WHO, e.by);

export const whoOf = (e: Named): string => (isActor(e) ? WHO[e.by] : e.by);

/** The short tag in the inspector's ledger list. */
export const shortOf = (e: Named): string => (isActor(e) ? (BY_SHORT[e.by] ?? e.by) : e.by);
