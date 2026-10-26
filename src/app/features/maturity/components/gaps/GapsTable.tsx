import type { CSSProperties, Ref } from 'react';
import { px, range } from '@/components/table/model/columns';
import type { Stage } from '@/schemas';
import type { Gap } from '../../model/ctx';
import type { Phase } from '../../model/flow/credit';
import type { MoveAction } from '../../model/flow/moves';
import { cx } from '../cx';
import { capsFor } from '../../model/keys/keymap';
import { mrName } from '../../model/rungs';
import { Unread } from '@/components/shell/host';
import { GapRow } from './GapRow';
import styles from './gaps.module.css';

const COLUMNS = [px(28), px(36), px(76), px(72), range(120, 1000), px(96), px(48), range(124, 320)].join(' ');
const HEADERS: readonly { label: string; cls?: string; tip?: string; aria?: string }[] = [
  { label: '✓', cls: styles.ctr, tip: `Pick (${capsFor('pick').join(' ')})`, aria: 'Pick' },
  { label: 'Gap' },
  { label: 'Stage' },
  { label: 'Move' },
  { label: 'Worth exploring' },
  { label: 'Tier' },
  { label: 'Diff', cls: styles.rt },
  { label: 'State', tip: 'Where a sent gap is, and its next move' },
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
  unread = false,
  onPick,
  onSelect,
  onOpen,
  onAct,
}: {
  gaps: readonly Gap[];
  picked: readonly string[];
  flow: Readonly<Record<string, Phase>>;
  mrs: Readonly<Record<string, string>>;
  selected: Stage;
  sectionRef: Ref<HTMLElement>;
  /** Live mode: each gap's invitation and files are demo fixtures, and say so. */
  live?: boolean;
  /** Not read yet (the screen host's core slice): one row with a dash, never "no gaps". */
  unread?: boolean;
  onPick: (id: string) => void;
  onSelect: (gap: Gap) => void;
  /** Enter or the gap's name: its stage's page. */
  onOpen: (gap: Gap) => void;
  /** A sent gap's next move from its row: merge, its job runs, rescan (all simulated). */
  onAct: (a: MoveAction) => void;
}) {
  return (
    <section ref={sectionRef} className={styles.gt} style={{ '--cols': COLUMNS } as CSSProperties} aria-label="Gaps worth exploring" role="table">
      <div className={cx(styles.row, styles.head)} role="row">
        {HEADERS.map((h) => (
          <div key={h.label} className={cx(styles.cell, styles.th, h.cls)} role="columnheader" title={h.tip} aria-label={h.aria}>
            {h.label}
          </div>
        ))}
      </div>
      <div role="rowgroup">
        {unread ? (
          <div role="row" aria-busy="true">
            <div role="cell" className={styles.empty}>
              <Unread label="gaps not read yet" />
            </div>
          </div>
        ) : gaps.length === 0 ? (
          <div role="row">
            <div role="cell" className={styles.empty}>
              No gaps proposed yet. Rescan to look for rungs worth exploring.
            </div>
          </div>
        ) : null}
        {gaps.map((g, i) => (
          <GapRow key={g.id} gap={g} picked={picked.includes(g.id)} phase={flow[g.id]} mr={mrName(mrs, g.id)} selected={selected === g.stage} alt={i % 2 === 1} live={live} onPick={onPick} onSelect={onSelect} onOpen={onOpen} onAct={onAct} />
        ))}
      </div>
    </section>
  );
}
