import type { ReactElement } from 'react';
import { InspCra } from './items/InspCra';
import { InspGap } from './items/InspGap';
import { InspPromote } from './items/InspPromote';
import { InspReadmit } from './items/InspReadmit';
import { InspRunner } from './items/InspRunner';
import { isGapId } from '../../model/rows/rowState';
import type { DecisionKey } from '../../model/types';
import type { InspProps } from './props';
import styles from './inspector.module.css';

/** One view per decision kind: a new DecisionKey fails typecheck here until it has a view. */
const VIEWS: Record<DecisionKey, (p: InspProps) => ReactElement> = { n1: InspPromote, n2: InspCra, n4: InspReadmit, n5: InspRunner };
const hasView = (id: string): id is DecisionKey => Object.prototype.hasOwnProperty.call(VIEWS, id);

/** The cards of one decision's page, chosen by the item id (`s.sel` is the id the page selected); a gap the demo does not hold says so too. */
export function NeedsInspector(p: InspProps & { id: string }) {
  const { id } = p;
  if (hasView(id)) {
    const View = VIEWS[id];
    return <View {...p} />;
  }
  if (isGapId(id) && p.demo.gaps.some((g) => g.id === id)) return <InspGap {...p} />;
  return <div className={styles.none}>No such decision</div>;
}
