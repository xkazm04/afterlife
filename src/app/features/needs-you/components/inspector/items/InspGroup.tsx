import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { plural } from '@/lib/format/plural';
import { GAP_DETAIL } from '../../../data/gaps';
import { pickedGaps } from '../../../model/act';
import { groupsFor } from '../../../model/rows/grouping';
import { rowView } from '../../../model/rows/rowData';
import { isGapId, rowState } from '../../../model/rows/rowState';
import { DecisionGlyph } from '../../shared/DecisionGlyph';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { ClickSec, Sec } from '../Sec';
import styles from './items.module.css';

/** A group row selected: its decisions at a glance, and "Stage n picked" for the gap groups. */
export function InspGroup({ gid, ...p }: InspProps & { gid: string }) {
  const { s, demo, dispatch } = p;
  const g = groupsFor(s.group, s).find((x) => x.id === gid);
  if (!g) return <div className={styles.muted}>No selection</div>;
  if (g.hist) return <InspectorHeader title={g.name} sub={`${g.ids.length} decisions · from the ledger`} />;
  const picked = pickedGaps(s, demo).length;
  return (
    <>
      <InspectorHeader title={g.name} sub={plural(g.ids.length, 'decision')} />
      {g.ids.some(isGapId) && picked ? (
        <Acts>
          <ActBtn dispatch={dispatch} action="stage-gaps" variant="accent">
            Stage {picked} picked · 1 MR each
          </ActBtn>
        </Acts>
      ) : null}
      <Sec k="g-list" title="Decisions" p={p}>
        {g.ids.map((id) => {
          const st = rowState(s, id);
          return (
            <div key={id} className={styles.lk}>
              <DecisionGlyph kind={st.glyph} />
              <span className={styles.t}>{rowView(s, id, demo)?.title}</span>
              <span className={styles.s}>{st.label}</span>
            </div>
          );
        })}
      </Sec>
      {gid === 'improve' ? <ClickSec k="g-click" p={p} does={GAP_DETAIL.does} doesNot={GAP_DETAIL.doesNot} /> : null}
    </>
  );
}
