'use client';

import { useEffect } from 'react';
import { onEscape } from '@/components/overlays/escapeLayers';
import { bindKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { GUIDE_KEYMAP } from '../model/keymap';
import { STEPS } from '../model/steps';
import { guideStore } from '../model/store';

const close = () => guideStore.close();

// Built once: every handler goes through the store, so none closes over render state. Escape is the overlay stack's
// (onEscape), so a popover opened over the guide closes first; Shift+G only opens.
const KEYS = bindKeymap(GUIDE_KEYMAP, {
  open: () => guideStore.open(),
  prev: () => guideStore.send({ type: 'prev' }),
  next: () => guideStore.send({ type: 'next' }),
  ends: [() => guideStore.send({ type: 'go', to: 0 }), () => guideStore.send({ type: 'go', to: STEPS.length - 1 })],
  play: (e) => {
    if (e.target instanceof Element && e.target.closest('button, a')) return; // Space presses the focused control
    e.preventDefault();
    guideStore.send({ type: 'toggle' });
  },
  leave: close,
});
const OPEN = KEYS.filter((k) => k.key === 'G');
const PLAYING = KEYS.filter((k) => k.key !== 'G' && k.key !== 'Escape');

/**
 * Shift+G opens the guide from any screen while it can play (`available`: the demo estate), heard before the screen so a
 * focused table's type-ahead cannot take it. While it is on, its keys are heard first too, and Escape leaves it.
 */
export function useGuideKeys(on: boolean, available: boolean): void {
  useHotkeys(OPEN, available && !on, true);
  useHotkeys(PLAYING, on, true);
  useEffect(() => (on ? onEscape(close) : undefined), [on]);
}
