// The sample screens' props on the wire (GET /api/screen/<key>) and back. JSON has no Set: fleet's list start state holds
// three (collapsed groups, state and tier filters), sent as arrays and revived here, so the client draws from exactly
// the props the page passes. Every other prop is plain data already (route.test.ts walks them). Pure, client-safe.
import type { FleetListState } from '@/app/features/fleet/model/list/urlState';
import type { ScreenProps } from '../data/screenProps';

type ArrayOf<S> = S extends ReadonlySet<infer T> ? T[] : never;

/** FleetListState with its Sets as arrays. */
export type FleetStartWire = Omit<FleetListState, 'collapsed' | 'filters'> & {
  collapsed: ArrayOf<FleetListState['collapsed']>;
  filters: Omit<FleetListState['filters'], 'states' | 'tiers'> & {
    states: ArrayOf<FleetListState['filters']['states']>;
    tiers: ArrayOf<FleetListState['filters']['tiers']>;
  };
};

export type ScreenWire = {
  monitor: ScreenProps['monitor'];
  fleet: Omit<ScreenProps['fleet'], 'start'> & { start: FleetStartWire };
  'needs-you': ScreenProps['needs-you'];
};

export type ScreenKey = keyof ScreenProps;

function startToWire(s: FleetListState): FleetStartWire {
  return { ...s, collapsed: [...s.collapsed], filters: { ...s.filters, states: [...s.filters.states], tiers: [...s.filters.tiers] } };
}

function startFromWire(s: FleetStartWire): FleetListState {
  return { ...s, collapsed: new Set(s.collapsed), filters: { ...s.filters, states: new Set(s.filters.states), tiers: new Set(s.filters.tiers) } };
}

/** A screen's props as the endpoint sends them. */
export function toWire<K extends ScreenKey>(key: K, props: ScreenProps[K]): ScreenWire[K];
export function toWire(key: ScreenKey, props: ScreenProps[ScreenKey]): ScreenWire[ScreenKey] {
  if (key !== 'fleet') return props as ScreenWire[typeof key];
  const fleet = props as ScreenProps['fleet'];
  return { ...fleet, start: startToWire(fleet.start) };
}

/** The endpoint's props back to what the page passes its screen. */
export function fromWire<K extends ScreenKey>(key: K, wire: ScreenWire[K]): ScreenProps[K];
export function fromWire(key: ScreenKey, wire: ScreenWire[ScreenKey]): ScreenProps[ScreenKey] {
  if (key !== 'fleet') return wire as ScreenProps[typeof key];
  const fleet = wire as ScreenWire['fleet'];
  return { ...fleet, start: startFromWire(fleet.start) };
}
