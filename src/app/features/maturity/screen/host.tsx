// maturity's screens for the screen host (docs/features/screen-host.md). A stub until W2 converts the module: ready is
// false, so the host never claims these keys and the route's page.tsx draws them through the router as before.
import { pendingScreen, type ScreenDef } from '@/components/shell/host';

export const screens: readonly ScreenDef[] = [
  pendingScreen('maturity', () => 'Belay Maturity'),
  pendingScreen('maturity/[stage]', (p) => `Belay Maturity ${p.stage}`),
];
