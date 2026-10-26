// vitals's screens for the screen host (docs/features/screen-host.md). A stub until W1 converts the module: ready is
// false, so the host never claims these keys and the route's page.tsx draws them through the router as before.
import { pendingScreen, type ScreenDef } from '@/components/shell/host';

export const screens: readonly ScreenDef[] = [
  pendingScreen('vitals', () => 'Belay Vitals'),
  pendingScreen('vitals/[project]', (p) => `Belay Vitals ${p.project}`),
];
