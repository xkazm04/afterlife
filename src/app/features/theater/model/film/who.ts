// Who an entry names: the illustrative slice's actors by their caption names, a real event's agent as it is.
import { BY_SHORT, WHO } from '../../data/constants';
import type { Actor } from '../types';

const isActor = (by: string): by is Actor => Object.hasOwn(WHO, by);

export const whoOf = (by: string): string => (isActor(by) ? WHO[by] : by);

/** The short tag in the inspector's ledger list. */
export const shortOf = (by: string): string => (isActor(by) ? (BY_SHORT[by] ?? by) : by);
