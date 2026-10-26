// The screen host's public face for screens (a module's screen/host.tsx and its Frame). ScreenHost itself and the
// registry are imported by the (app) layout and nothing else: importing them here would loop module -> host -> module.
export type { ScreenDef, ScreenFrameProps } from './model/types';
export type { ScreenKey, RouteMatch } from './model/routes';
export type { Json, SliceState } from './model/wire';
export { matchRoute, pathFor, SCREEN_KEYS } from './model/routes';
export { useSlice, useScreenRead, useHostNav, useRevalidate, useHerePath, type HostNav } from './hooks/useSlice';
export { SliceFixture } from './hooks/scope';
export { Reveal, Unread } from './reveal/Reveal';
export { pendingScreen } from './pending';
