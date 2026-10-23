import { Legend } from '@/components/overlays/popover/Legend';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { StageTicks } from '@/components/viz/StageTicks';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { TierInfo, TierKey } from '@/lib/demo/types';
import { STANDING_META, STANDINGS, TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { PROJECT_STATES } from '../../model/list/urlState';
import { ChangeMark } from '../table/cells/ChangeMark';
import styles from './legend.module.css';

/** The "?" legend: tiers, the needs-you badges, the four states, proofs, stage rungs, hatching, change marks and the keys.
 * The change mark and the keys are the Fleet table's: the project page, which has no table, passes `keys={false}`. */
export function FleetLegend({ tiers, keys = true }: { tiers: Record<TierKey, TierInfo>; keys?: boolean }) {
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
          ...PROJECT_STATES.map((s) => [<StateGlyph key={s} state={s} />, STATE_LABEL[s]] as const),
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
          // a change mark is the Fleet table's too: the project page has no rows to mark
          ...(keys ? [[<ChangeMark key="ch" />, 'Moved since your last look (hover for what); Mark seen in the sidebar resets it'] as const] : []),
        ]}
      />
      {keys ? (
        <>
          <hr />
          <div className={styles.keys}>↑↓ Home End move · ←→ collapse · ↩ open the project page · / or type to search · right-click or Menu key for actions</div>
        </>
      ) : null}
    </>
  );
}
