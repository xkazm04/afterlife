// The contract every screen fills to be drawn by the host: a ScreenDef per key, exported from the module's own
// src/app/features/<module>/screen/host.tsx as `screens`. The host (ScreenHost) renders the Frame inside <Activity>,
// the Frame reads its slices with useSlice. Types only.
import type { ComponentType, ReactNode } from 'react';
import type { ScreenKey } from './routes';

export interface ScreenFrameProps {
  /** The key's param ({ project: 'p1' } for 'fleet/[project]'); empty for a key without one. */
  params: Readonly<Record<string, string>>;
  /** The URL's query as it is now (the host updates it on every URL change, the screen's own replaceState included). */
  search: URLSearchParams;
}

export interface ScreenDef {
  key: ScreenKey;
  /**
   * False (the default): the host does not claim the key; links go through the router and the route's page.tsx draws
   * it as before. A module sets true only once its Frame works end to end on the stream.
   */
  ready?: boolean;
  /** The slices the server streams, in its declared order (core first). A slice not listed is never read. */
  slices: readonly string[];
  /** The screen: paints its real frame at once from useSlice states (an em dash for what is unread). */
  Frame: ComponentType<ScreenFrameProps>;
  /**
   * A provider hoisted out of a route layout (NeedsStore, MaturityProvider, ...): mounted once around every visited
   * screen that names the same component, for as long as any of them is mounted. Use one module-level component.
   */
  Session?: ComponentType<{ children: ReactNode }>;
  /** The tab title (the host renders it as a React <title>): the same words the page's metadata gives a hard load. */
  title: (params: Readonly<Record<string, string>>, search: URLSearchParams) => string;
  /** Drawn instead of the Frame when a slice answers notFound. Absent: the host's generic not-found window. */
  NotFound?: ComponentType<{ params: Readonly<Record<string, string>> }>;
}
