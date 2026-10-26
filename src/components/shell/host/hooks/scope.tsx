'use client';

// Which screen a component is inside: the host wraps each visited screen in ScreenScope (its key), so useSlice reads
// that screen's slices. SliceFixture pins slices to fixed states instead: tests, the kit, a Frame drawn outside the host.
import { createContext, useContext, type ReactNode } from 'react';
import type { ScreenKey } from '../model/routes';
import type { SliceState } from '../model/wire';

export type Scope = { key: ScreenKey } | { fixed: Readonly<Record<string, SliceState<unknown>>> } | null;

const ScopeContext = createContext<Scope>(null);

export function ScreenScope({ screen, children }: { screen: ScreenKey; children: ReactNode }) {
  return <ScopeContext.Provider value={{ key: screen }}>{children}</ScopeContext.Provider>;
}

/**
 * Draw a Frame with fixed slices: each named slice ok with its data (asOf the epoch unless given), every other one
 * unread, or pass full SliceStates through `states`.
 */
export function SliceFixture({
  slices = {},
  states = {},
  asOf = '1970-01-01T00:00:00.000Z',
  children,
}: {
  slices?: Readonly<Record<string, unknown>>;
  states?: Readonly<Record<string, SliceState<unknown>>>;
  asOf?: string;
  children: ReactNode;
}) {
  const fixed: Record<string, SliceState<unknown>> = { ...states };
  for (const [name, data] of Object.entries(slices)) fixed[name] = { state: 'ok', data, asOf };
  return <ScopeContext.Provider value={{ fixed }}>{children}</ScopeContext.Provider>;
}

export function useScope(): Scope {
  return useContext(ScopeContext);
}
