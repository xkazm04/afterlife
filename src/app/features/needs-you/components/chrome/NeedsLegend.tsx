import { Legend } from '@/components/overlays/popover/Legend';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierMark } from '@/components/status/TierMark';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import type { TierKey } from '@/lib/demo/types';
import { capsOf, type Keymap } from '@/lib/keyboard/keymap';
import { GRADES, GRADE_NEVER } from '../../data/cra';
import { NEEDS_KEYMAP } from '../../model/keys/keymap';
import type { GlyphKind } from '../../model/rows/rowState';
import { DecisionGlyph } from '../shared/DecisionGlyph';
import { GradeChip } from '../shared/GradeChip';
import styles from './chrome.module.css';

/** The grade ladder sentence, built from GRADES so a renamed or reworded grade reaches the legend. */
const GRADE_LINE = `Grade: ${GRADES.map((g) => `${g.name} (${g.why})`).join(' → ')}. Never "${GRADE_NEVER.name}".`;

/** What each row glyph means: keyed by GlyphKind, so a glyph a row can draw cannot go unexplained. */
export const GLYPH_MEANS: Readonly<Record<GlyphKind, string>> = {
  wait: 'Waiting for you',
  stg: 'Staged in the outbox, not sent',
  ok: 'Sent or decided',
  unk: 'Unknown, drawn dashed',
  dash: 'Set aside: not yet, nothing sent',
  open: 'A gap you can pick, not picked yet',
};
const GLYPHS = Object.keys(GLYPH_MEANS) as GlyphKind[];

type KeyId = typeof NEEDS_KEYMAP extends Keymap<infer I> ? I : never;
/** The legend's short phrase per keymap entry; the keys come from the keymap, so a bound key is a named key. */
const WORD: Record<KeyId, string> = { search: 'search', escape: 'clear search', toTable: 'leave the search field' };
const DOC_KEYS = NEEDS_KEYMAP.entries.map((e) => `${capsOf(e.keys).join(' ')} ${WORD[e.id]}`).join(' · ');

/** The legend behind "?": tiers, row states, the seeded mark, the grade ladder and the keyboard. */
export function NeedsLegend({ tierMeans }: { tierMeans: Record<TierKey, string> }) {
  return (
    <>
      <Legend rows={TIER_DISPLAY_ORDER.map((t) => [<TierMark key={t} tier={t} />, `${TIER_META[t].name} — ${tierMeans[t]}`] as const)} />
      <hr />
      <Legend
        rows={[
          ...GLYPHS.map((k) => [<DecisionGlyph key={k} kind={k} />, GLYPH_MEANS[k]] as const),
          [<HonestyChip key="h" kind="seeded">s</HonestyChip>, 'Seeded fault for the demo'],
        ]}
      />
      <hr />
      <Legend rows={[[<GradeChip key="g" state="cur">r</GradeChip>, GRADE_LINE]]} />
      <hr />
      <div className={styles.keys}>↑↓ move · ←→ collapse · ↩ open the decision page · Space pick / act · {DOC_KEYS} · right-click for actions</div>
    </>
  );
}
