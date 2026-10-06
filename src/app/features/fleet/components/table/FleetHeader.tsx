import { Icon } from '@/components/icons/Icon';
import { HeaderCell } from '@/components/table/HeaderCell';
import type { SortState } from '@/components/table/model/sort';
import { TierMark } from '@/components/status/TierMark';
import { TIER_META } from '@/lib/tiers';
import type { ColumnSpec } from '../../model/columns';
import { rankedTier } from '../../model/list/sorting';
import type { SortKey } from '../../model/types';
import styles from './fleetTable.module.css';

/** The state column's header: an open ring (the row glyphs are filled or dashed versions of it). */
function StateRing() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" style={{ width: 'calc(10px * var(--ui-scale))', height: 'calc(10px * var(--ui-scale))' }} aria-hidden="true">
      <circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function headContent(c: ColumnSpec, narrow: boolean) {
  if (c.kind === 'state') return <StateRing />;
  if (c.kind === 'needs') {
    return (
      <span className={styles.needsHead}>
        <Icon name="diamond" />
      </span>
    );
  }
  // A tier header is its coloured name; in a narrow pane only the letter mark fits.
  if (c.kind === 'tier' && c.tier) return narrow ? <TierMark tier={c.tier} /> : <span className={styles.tname}>{TIER_META[c.tier].name}</span>;
  // A class header has only 42px: let its label use the cell's padding too.
  if (c.kind === 'class') return <span className={styles.ccLab}>{c.label}</span>;
  return c.label;
}

/** Every column header of the table, sortable; the header of the tier the list is ranked by is tinted. */
export function FleetHeader({
  columns,
  sort,
  onSort,
  narrow,
}: {
  columns: readonly ColumnSpec[];
  sort: SortState<SortKey>;
  onSort: (key: SortKey) => void;
  narrow: boolean;
}) {
  const ranked = rankedTier(sort);
  return (
    <>
      {columns.map((c) => (
        <HeaderCell<SortKey> key={c.key} sortKey={c.key} sort={sort} onSort={onSort} align={c.align} tip={c.tip} tier={c.tier} ranked={c.tier !== undefined && c.tier === ranked}>
          {headContent(c, narrow)}
        </HeaderCell>
      ))}
    </>
  );
}
