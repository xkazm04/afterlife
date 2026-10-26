'use client';

// The kit on the screen host (docs/features/screen-host.md): static, no slice. The whole gallery paints in the click's
// frame; its Unread/Reveal specimen (components/fallback/RevealSpecimen.tsx) shows the frame-first look on demand.
// Reveal order: 0 the window and every gallery, at once (a dev gallery has nothing to wait for).
import type { ScreenDef } from '@/components/shell/host';
import { KitScreen } from '../KitScreen';

export const screens: readonly ScreenDef[] = [{ key: 'kit', ready: true, slices: [], Frame: KitScreen, title: () => 'Belay kit' }];
