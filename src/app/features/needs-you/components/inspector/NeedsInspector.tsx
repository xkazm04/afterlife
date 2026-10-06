import { InspCra } from './items/InspCra';
import { InspGap } from './items/InspGap';
import { InspGroup } from './items/InspGroup';
import { InspHistory } from './items/InspHistory';
import { InspPromote } from './items/InspPromote';
import { InspReadmit } from './items/InspReadmit';
import { InspRunner } from './items/InspRunner';
import { isGapId } from '../../model/rows/rowState';
import { isHistId } from '../../model/rows/history';
import type { InspProps } from './props';
import styles from './inspector.module.css';

/** Layer 2: the selected row's detail. Which view is chosen by the selection id alone. */
export function NeedsInspector(p: InspProps) {
  const sel = p.s.sel;
  if (sel.startsWith('g:')) return <InspGroup gid={sel.slice(2)} {...p} />;
  if (sel === 'n2') return <InspCra {...p} />;
  if (sel === 'n1') return <InspPromote {...p} />;
  if (sel === 'n4') return <InspReadmit {...p} />;
  if (sel === 'n5') return <InspRunner {...p} />;
  if (isGapId(sel)) return <InspGap id={sel} {...p} />;
  if (isHistId(sel)) return <InspHistory id={sel} {...p} />;
  return <div className={styles.none}>No selection</div>;
}
