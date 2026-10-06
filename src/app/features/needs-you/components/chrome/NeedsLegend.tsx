import { Legend } from '@/components/overlays/popover/Legend';
import { HonestyChip } from '@/components/status/HonestyChip';
import { TierMark } from '@/components/status/TierMark';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import type { TierKey } from '@/lib/demo/types';
import { DecisionGlyph } from '../shared/DecisionGlyph';
import { GradeChip } from '../shared/GradeChip';
import styles from './chrome.module.css';

/** The legend behind "?": tiers, row states, the seeded mark, the grade ladder and the keyboard. */
export function NeedsLegend({ tierMeans }: { tierMeans: Record<TierKey, string> }) {
  return (
    <>
      <Legend rows={TIER_DISPLAY_ORDER.map((t) => [<TierMark key={t} tier={t} />, `${TIER_META[t].name} — ${tierMeans[t]}`] as const)} />
      <hr />
      <Legend
        rows={[
          [<DecisionGlyph key="w" kind="wait" />, 'Waiting for you'],
          [<DecisionGlyph key="s" kind="stg" />, 'Staged in the outbox, not sent'],
          [<DecisionGlyph key="o" kind="ok" />, 'Sent or decided'],
          [<DecisionGlyph key="u" kind="unk" />, 'Unknown, drawn dashed'],
          [<HonestyChip key="h" kind="seeded">s</HonestyChip>, 'Seeded fault for the demo'],
        ]}
      />
      <hr />
      <Legend rows={[[<GradeChip key="g" state="cur">r</GradeChip>, 'Grade: draft (a link unresolved) → reviewable (all resolve) → ready to sign (a person read it). Never "attested".']]} />
      <hr />
      <div className={styles.keys}>↑↓ move · ←→ collapse · ↩ inspector · Space pick / act · Esc close · / search · ⌘I or Ctrl+I inspector · right-click for actions</div>
    </>
  );
}
