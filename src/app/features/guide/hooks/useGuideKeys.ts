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
// (onEscape), so a popover opened over the guide closes first; G only opens.
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
const OPEN = KEYS.filter((k) => k.key === 'g');
const PLAYING = KEYS.filter((k) => k.key !== 'g' && k.key !== 'Escape');

/**
 * G opens the guide from any screen while it can play (`available`: the demo estate). While it is on, its keys are heard
 * before the screen's own, and Escape leaves it.
 */
export function useGuideKeys(on: boolean, available: boolean): void {
  useHotkeys(OPEN, available && !on);
  useHotkeys(PLAYING, on, true);
  useEffect(() => (on ? onEscape(close) : undefined), [on]);
}
