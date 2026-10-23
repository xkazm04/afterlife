import { Icon } from '@/components/icons/Icon';
import { HeaderCell } from '@/components/table/HeaderCell';
import type { SortState } from '@/components/table/model/sort';
import { TierMark } from '@/components/status/TierMark';
import { TIER_META } from '@/lib/tiers';
import type { ColumnSpec } from '../../model/columns';
import { rankedTier } from '../../model/list/sorting';
import type { SortKey } from '../../model/types';
import styles from './fleetTable.module.css';

function headContent(c: ColumnSpec, narrow: boolean) {
  if (c.kind === 'state') return <Icon name="ring" />; // an open ring: the row glyphs are filled or dashed versions of it
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

/** True when the header shows no text (a ring, a diamond, a tier's letter mark): its tip names it. */
const iconOnly = (c: ColumnSpec, narrow: boolean): boolean => c.kind === 'state' || c.kind === 'needs' || (c.kind === 'tier' && narrow);

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
        <HeaderCell<SortKey> key={c.key} sortKey={c.key} sort={sort} onSort={onSort} align={c.align} tip={c.tip} iconOnly={iconOnly(c, narrow)} tier={c.tier} ranked={c.tier !== undefined && c.tier === ranked}>
          {headContent(c, narrow)}
        </HeaderCell>
      ))}
    </>
  );
}
