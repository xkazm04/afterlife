import { Legend } from '@/components/overlays/popover/Legend';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { StageTicks } from '@/components/viz/StageTicks';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { ProjectState, TierInfo, TierKey } from '@/lib/demo/types';
import { STANDING_META, TIER_DISPLAY_ORDER, TIER_META, type Standing } from '@/lib/tiers';
import styles from './legend.module.css';

const STATES: readonly ProjectState[] = ['watching', 'setting-up', 'stale', 'not-set-up'];
const STANDINGS: readonly Standing[] = ['no_record', 'refused'];

/** The "?" legend: tiers, the needs-you badges, the four states, proofs, stage rungs, hatching and the keys. */
export function FleetLegend({ tiers }: { tiers: Record<TierKey, TierInfo> }) {
  return (
    <>
      <Legend
        rows={[
          ...TIER_DISPLAY_ORDER.map((t) => [<TierMark key={t} tier={t} />, `${TIER_META[t].name} — ${tiers[t].means}`] as const),
          ...STANDINGS.map((s) => [<TierMark key={s} tier={s} />, `${STANDING_META[s].name} — ${STANDING_META[s].means}; not a quarantine`] as const),
        ]}
      />
      <hr />
      <Legend
        rows={[
          [<NeedsYouBadge key="live" count={3} />, 'Decisions waiting for you'],
          [<NeedsYouBadge key="lk" count={1} variant="last-known" />, 'Waiting, last known (stale)'],
          ...STATES.map((s) => [<StateGlyph key={s} state={s} />, STATE_LABEL[s]] as const),
          [
            <span key="pf" className={styles.proofs}>
              <i className={styles.ok} />
              <i className={styles.fl} />
              <i className={styles.inc} />
            </span>,
            'Proofs: pass · fail · inconclusive',
          ],
          [<StageTicks key="st" rungs={[1, 3, null]} />, 'Stage rungs 0–4; dashed = unknown'],
          [<span key="ha" className={styles.hatch} />, 'Hatched = stale, last known values'],
        ]}
      />
      <hr />
      <div className={styles.keys}>↑↓ move · ←→ collapse · ↩ open · Esc close · / search · ⌘I inspector · right-click for actions</div>
    </>
  );
}
