import { Cell } from '@/components/table/Cell';
import { groupRed, percent, type Stability } from '@/lib/stability/stability';
import styles from './cells.module.css';

/**
 * A group's red pipelines over the last 7 days: failed of the final head pipelines of its projects' agent MRs, summed,
 * shown with its n. No project read is an empty cell; read but no final pipeline is a dash, never 0%.
 */
export function RedRateCell({ list, group }: { list: readonly (Stability | undefined)[]; group: string }) {
  const red = groupRed(list);
  if (!red) return <Cell />;
  const title =
    red.redRate === null
      ? `Red pipelines: no agent MR in ${group} has a final head pipeline in the last 7 days`
      : `Red pipelines: ${red.failed} of ${red.finals} final head pipelines of agent MRs in ${group}, last 7 days (${red.read} projects read)`;
  return (
    <Cell className={styles.cost} title={title}>
      {red.redRate === null ? '-' : `${percent(red.redRate)} red · ${red.finals}`}
    </Cell>
  );
}
