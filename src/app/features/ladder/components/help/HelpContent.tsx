'use client';

import { Button } from '@/components/controls/Button';
import { Kbd } from '@/components/controls/Kbd';
import { Legend } from '@/components/overlays/popover/Legend';
import { TierMark } from '@/components/status/TierMark';
import { RungGlyph } from '@/components/viz/RungGlyph';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { KEY_ROWS } from '../../data/policy';
import type { Ceiling } from '../../model/types';
import styles from './help.module.css';

/** Behind "?": the keys, the legend of every mark in the table, and Reset demo. */
export function HelpContent({ means, onReset }: { means: Readonly<Record<Ceiling, string>>; onReset: () => void }) {
  return (
    <>
      <h4>Keys</h4>
      <div className={styles.keys}>
        {KEY_ROWS.map(([caps, what]) => (
          <div key={what} style={{ display: 'contents' }}>
            <span className={styles.caps}>
              {caps.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
            <span>{what}</span>
          </div>
        ))}
      </div>
      <hr />
      <h4>Legend</h4>
      <Legend
        rows={[
          ...TIER_DISPLAY_ORDER.map((t) => [<TierMark key={t} tier={t} />, `${TIER_META[t].name} · ${means[t]}`] as const),
          [<RungGlyph key="rung" tier="supervised" ceiling="supervised" compact />, 'Rung: Q A S H · filled now · hatched above the ceiling'],
          [
            <span key="strip" className={styles.mini}>
              <i />
              <i className={styles.f} />
              <i className={styles.f} />
              <i className={styles.f} />
            </span>,
            'Clean days of the last 14',
          ],
          [<span key="unk" className={`${styles.mini} ${styles.unk}`} />, 'Dashed · no record'],
        ]}
      />
      <hr />
      <div className={styles.reset}>
        <Button onClick={onReset}>Reset demo</Button>
      </div>
    </>
  );
}
