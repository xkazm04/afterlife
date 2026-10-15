// The per-screen keys, derived from the keymaps each screen's hook binds (src/app/features/<screen>/model/.../keymap.ts),
// so the reference cannot drift from the keys. Plain data: every module it reaches is server-safe (screenKeys.test.ts).
import { capsOf, type Keymap } from '@/lib/keyboard/keymap';
import { FLEET_KEYMAP } from '../../fleet/model/keys/keymap';
import { LADDER_KEYMAP } from '../../ladder/model/keymap';
import { MATURITY_KEYMAP, MATURITY_SHEET_KEYMAP } from '../../maturity/model/keymap';
import { NEEDS_KEYMAP } from '../../needs-you/model/keys/keymap';
import { TASK_KEYMAP } from '../../task/model/docket/keys';
import { THEATER_KEYMAP } from '../../theater/model/keymap';

export interface ScreenKeys {
  screen: string;
  keys: readonly { keys: readonly string[]; does: string }[];
}

/** One screen's rows from its keymaps (a screen with a modal part, like Maturity's sheet, has more than one). */
function toScreenKeys(maps: readonly Keymap[]): ScreenKeys {
  return { screen: maps[0]?.screen ?? '', keys: maps.flatMap((m) => m.entries.map((e) => ({ keys: capsOf(e.keys), does: e.does }))) };
}

export const SCREEN_KEYS: readonly ScreenKeys[] = [
  [FLEET_KEYMAP],
  [NEEDS_KEYMAP],
  [LADDER_KEYMAP],
  [MATURITY_KEYMAP, MATURITY_SHEET_KEYMAP],
  [TASK_KEYMAP],
  [THEATER_KEYMAP],
].map(toScreenKeys);
