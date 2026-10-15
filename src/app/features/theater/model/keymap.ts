// The Theater's keys, declared once: hooks/useTheaterKeys binds them, Settings > Keyboard lists them. Pure, server-safe.
// One cue key per take up to MAX_TAKES; the hook binds only as many as the film has. Cmd/Ctrl+I is the Window's.
import { defineKeymap } from '@/lib/keyboard/keymap';
import { MAX_TAKES } from './film/fromLedger';

export const THEATER_KEYMAP = defineKeymap('Theater', [
  { id: 'cue', keys: Array.from({ length: MAX_TAKES }, (_, k) => ({ key: String(k + 1) })), does: 'Cue a take' },
  { id: 'play', keys: [{ key: ' ', once: true }], does: 'Play / pause' },
  { id: 'rollLoop', keys: [{ key: 'r', once: true }, { key: 'l', once: true }], does: 'Roll / loop' },
  { id: 'marks', keys: [{ key: 'i' }, { key: 'o' }], does: 'Mark in / out' },
  { id: 'seek', keys: ['ArrowLeft', 'ArrowRight', 'Home', 'End'].map((key) => ({ key })), does: 'Step, jump to start / end' },
  { id: 'present', keys: [{ key: 'f', once: true }, { key: 'Escape', preventDefault: false }], does: 'Present / leave' },
]);
