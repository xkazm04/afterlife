// task's screens for the screen host (docs/features/screen-host.md). A stub until W3 converts the module: ready is
// false, so the host never claims these keys and the route's page.tsx draws them through the router as before.
import { pendingScreen, type ScreenDef } from '@/components/shell/host';

export const screens: readonly ScreenDef[] = [
  pendingScreen('task', () => 'Belay Task'),
  pendingScreen('task/[id]', (p) => `Belay Task ${p.id}`),
];
