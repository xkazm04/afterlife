// settings's screens for the screen host (docs/features/screen-host.md). A stub until W4 converts the module: ready is
// false, so the host never claims these keys and the route's page.tsx draws them through the router as before.
import { pendingScreen, type ScreenDef } from '@/components/shell/host';

export const screens: readonly ScreenDef[] = [
  pendingScreen('settings/display', () => 'Belay Settings Display'),
  pendingScreen('settings/data', () => 'Belay Settings Data & connection'),
  pendingScreen('settings/keyboard', () => 'Belay Settings Keyboard'),
  pendingScreen('settings/about', () => 'Belay Settings About'),
];
