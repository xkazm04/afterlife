// The guide's keys, declared once: hooks/useGuideKeys binds them while the guide is on, Settings > Keyboard lists them.
// Pure, server-safe. Shift+G opens it from anywhere (a bare letter is a focused table's type-ahead); the rest only work
// while it plays, and take precedence over the screen under it.
import { defineKeymap } from '@/lib/keyboard/keymap';

export const GUIDE_KEYMAP = defineKeymap('Guide', [
  { id: 'open', keys: [{ key: 'G', shift: true, once: true }], does: 'Watch the guide (Shift+G, any screen)' },
  { id: 'prev', keys: [{ key: 'ArrowLeft' }], does: 'Previous step' },
  { id: 'next', keys: [{ key: 'ArrowRight' }], does: 'Next step' },
  { id: 'ends', keys: [{ key: 'Home' }, { key: 'End' }], does: 'First step / the recap' },
  { id: 'play', keys: [{ key: ' ', once: true, preventDefault: false }], does: 'Play / pause' },
  { id: 'leave', keys: [{ key: 'Escape' }], does: 'Leave the guide' },
]);
