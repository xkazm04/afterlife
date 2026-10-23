import { Cell } from '@/components/table/Cell';
import type { CostSum } from '@/lib/runs/desk/join';
import styles from './cells.module.css';

/** Dollars in a narrow cell: cents below $1,000, then thousands; the title has the exact figure. */
export const shortUsd = (n: number): string => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`);

/**
 * A group's agent spend: the known project costs summed, with how many of its projects are metered in the title. None
 * metered is a dash, never $0; not read (no runner desk) is an empty cell.
 */
export function CostTotalCell({ sum, group }: { sum: CostSum | null; group: string }) {
  if (!sum) return <Cell />;
  const title =
    sum.costUsd === null
      ? `Agent spend: none of the ${sum.of} projects in ${group} is metered by the cycle runner`
      : `Agents spent $${sum.costUsd.toFixed(2)} in ${group} · ${sum.metered} of ${sum.of} projects metered`;
  return (
    <Cell align="end" className={styles.cost} title={title}>
      {sum.costUsd === null ? '-' : shortUsd(sum.costUsd)}
    </Cell>
  );
}
