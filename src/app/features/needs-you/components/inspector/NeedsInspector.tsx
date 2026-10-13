import { InspCra } from './items/InspCra';
import { InspGap } from './items/InspGap';
import { InspPromote } from './items/InspPromote';
import { InspReadmit } from './items/InspReadmit';
import { InspRunner } from './items/InspRunner';
import { isGapId } from '../../model/rows/rowState';
import type { InspProps } from './props';
import styles from './inspector.module.css';

/** The cards of one decision's page. Which view is chosen by the item id alone (`s.sel` is the id the page selected). */
export function NeedsInspector(p: InspProps & { id: string }) {
  const { id } = p;
  if (id === 'n2') return <InspCra {...p} />;
  if (id === 'n1') return <InspPromote {...p} />;
  if (id === 'n4') return <InspReadmit {...p} />;
  if (id === 'n5') return <InspRunner {...p} />;
  if (isGapId(id)) return <InspGap {...p} />;
  return <div className={styles.none}>No such decision</div>;
}
