// A key's placeholder ScreenDef until its module converts it: ready false, so the host never claims it and the route's
// page.tsx draws it through the router exactly as before. Its Frame draws nothing (the host never renders it).
import type { ScreenDef } from './model/types';
import type { ScreenKey } from './model/routes';

function NotConverted() {
  return null;
}

export function pendingScreen(key: ScreenKey, title: ScreenDef['title']): ScreenDef {
  return { key, ready: false, slices: [], Frame: NotConverted, title };
}
