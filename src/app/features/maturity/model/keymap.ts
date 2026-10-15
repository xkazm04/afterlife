// Maturity's keys, declared once: hooks/useMaturityKeys binds them, Settings > Keyboard lists them. Pure, server-safe.
// Two maps because they switch: the screen's keys are off while the Send sheet is open, the sheet's only on then.
import { defineKeymap } from '@/lib/keyboard/keymap';
import type { Step } from './state';

/** The stepper's steps, one digit key each. */
export const STEP_KEYS: readonly Step[] = [1, 2, 3, 4];

export const MATURITY_KEYMAP = defineKeymap('Maturity', [
  { id: 'move', keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((key) => ({ key })), does: 'Move between stages' },
  { id: 'go', keys: STEP_KEYS.map((k) => ({ key: String(k) })), does: 'Go to a step' },
  { id: 'pick', keys: [{ key: 'p' }], does: 'Pick the selected gap' },
  { id: 'mode', keys: [{ key: 'd' }, { key: 'n' }, { key: 't' }], does: 'Day 0 / now / target' },
  { id: 'rescan', keys: [{ key: 'r' }], does: 'Rescan all' },
]);

export const MATURITY_SHEET_KEYMAP = defineKeymap('Maturity', [
  { id: 'send', keys: [{ key: 'Enter', preventDefault: false }], does: 'Send, in the sheet' },
]);
