import type { Ceiling } from '@/schemas';
import { TIER_META } from '@/lib/tiers';
import { rungCells } from './model/cells';
import styles from './RungGlyph.module.css';

/** The rung-in-ceiling glyph from the Ladder, with the "≤ H" caption (hidden with `compact`). */
export function RungGlyph({ tier, ceiling, compact }: { tier: Ceiling; ceiling: Ceiling; compact?: boolean }) {
  const cells = rungCells(tier, ceiling);
  const title =
    ceiling === 'human_only'
      ? 'Human only: no agent rung'
      : `now ${TIER_META[tier].name} · ceiling ${TIER_META[ceiling].name}`;
  return (
    <>
      <span className={styles.lad} data-tier={ceiling === 'human_only' ? undefined : tier} title={title}>
        {cells.map((c, i) => (
          <i key={i} className={c === 'at' ? styles.at : c === 'out' ? styles.out : undefined} />
        ))}
      </span>
      {compact ? null : <span className={styles.le}>≤ {TIER_META[ceiling].letter}</span>}
    </>
  );
}
