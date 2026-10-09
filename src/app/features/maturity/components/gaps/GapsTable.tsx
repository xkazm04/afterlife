import type { CSSProperties, Ref } from 'react';
import { px, range } from '@/components/table/model/columns';
import type { Stage } from '@/schemas';
import type { Gap } from '../../model/ctx';
import type { Phase } from '../../model/flow/credit';
import { cx } from '../cx';
import { mrName } from '../../model/rungs';
import { GapRow } from './GapRow';
import styles from './gaps.module.css';

const COLUMNS = [px(28), px(36), px(76), px(72), range(120, 1000), px(96), px(48), px(124)].join(' ');
const HEADERS: readonly { label: string; cls?: string; tip?: string }[] = [
  { label: '✓', cls: styles.ctr, tip: 'Pick (P)' },
  { label: 'Gap' },
  { label: 'Stage' },
  { label: 'Move' },
  { label: 'Worth exploring' },
  { label: 'Tier' },
  { label: 'Diff', cls: styles.rt },
  { label: 'State' },
];

/** The gaps under the crag: one row per proposal. Picking here, on the crag tag or with P is the same pick. */
export function GapsTable({
  gaps,
  picked,
  flow,
  mrs,
  selected,
  sectionRef,
  live = false,
  onPick,
  onSelect,
}: {
  gaps: readonly Gap[];
  picked: readonly string[];
  flow: Readonly<Record<string, Phase>>;
  mrs: Readonly<Record<string, string>>;
  selected: Stage;
  sectionRef: Ref<HTMLElement>;
  /** Live mode: each gap's invitation and files are demo fixtures, and say so. */
  live?: boolean;
  onPick: (id: string) => void;
  onSelect: (gap: Gap) => void;
}) {
  return (
    <section ref={sectionRef} className={styles.gt} style={{ '--cols': COLUMNS } as CSSProperties} aria-label="Gaps worth exploring" role="table">
      <div className={cx(styles.row, styles.head)} role="row">
        {HEADERS.map((h) => (
          <div key={h.label} className={cx(styles.cell, styles.th, h.cls)} role="columnheader" title={h.tip}>
            {h.label}
          </div>
        ))}
      </div>
      <div role="rowgroup">
        {gaps.map((g, i) => (
          <GapRow key={g.id} gap={g} picked={picked.includes(g.id)} phase={flow[g.id]} mr={mrName(mrs, g.id)} selected={selected === g.stage} alt={i % 2 === 1} live={live} onPick={onPick} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
