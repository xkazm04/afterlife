// Fleet's slices as the screen host hands them to the client (screen/slices.ts streams them): their shapes, and how the
// read ones fold into what the screen draws. Pure. An unread or failed slice is not read: null or absent, never zero.
import type { SliceState } from '@/components/shell/host';
import type { CostJoin } from '@/lib/runs/desk/join';
import type { RunnerDesk } from '@/lib/runs/desk/types';
import type { FleetSignals } from '../../data/loadFleetEstate';
import type { FleetData, FleetEstate, FleetSource } from '../types';

export type { FleetSignals };

/** /fleet's core: the fleet and its source. */
export interface FleetCore {
  data: FleetData;
  source: FleetSource;
}

/** /fleet's desk: the cycle runner's strip and its spend on the projects. */
export interface FleetDesk {
  runner: RunnerDesk;
  cost: CostJoin;
}

/** /fleet/[project]'s desk: the spend only. */
export interface ProjectDesk {
  cost: CostJoin;
}

/** The estate the table, the status bar and the project cards read: each part from its slice, null until read. */
export function estateOf(signals: SliceState<FleetSignals>, desk: SliceState<{ cost: CostJoin }>): FleetEstate {
  return {
    cost: desk.state === 'ok' ? desk.data.cost : null,
    stability: signals.state === 'ok' ? signals.data.stability : null,
    trend: signals.state === 'ok' ? signals.data.trend : null,
  };
}

/** A slice's data when read, else undefined. */
export const dataOf = <T>(s: SliceState<T>): T | undefined => (s.state === 'ok' ? s.data : undefined);

/** A slice's failure, when it failed. */
export const reasonOf = (s: SliceState<unknown>): string | undefined => (s.state === 'error' ? s.reason : undefined);
