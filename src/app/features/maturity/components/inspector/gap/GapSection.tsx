import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { MaturityCtx, Gap } from '../../../model/ctx';
import type { Action } from '../../../model/reducer';
import type { MaturityState } from '../../../model/state';
import { rungText } from '../../../model/rungs';
import { AfterMerge } from './AfterMerge';
import { DiffView } from './DiffView';
import styles from './gap.module.css';

/**
 * The selected stage's gap: an invitation ("worth exploring"), Pick, the diff it would write, and what it earns. Once
 * sent, the same section follows it through merge, run, rescan and credit.
 */
export function GapSection({
  ctx,
  state,
  gap,
  dispatch,
}: {
  ctx: MaturityCtx;
  state: MaturityState;
  gap: Gap;
  dispatch: (a: Action) => void;
}) {
  const x = gap.x;
  const phase = state.flow[gap.id];
  const picked = state.picked.includes(gap.id) && !phase;
  return (
    <InspectorSection
      title={`Gap ${gap.id}`}
      aux={`${rungText(gap.from)} → ${rungText(gap.to)}`}
      open={state.open.gap}
      onOpenChange={(open) => dispatch({ type: 'section', key: 'gap', open })}
    >
      <div className={styles.gh}>
        <span className={styles.t}>{gap.title}</span>
      </div>
      <p className={styles.inv}>{x.invite}</p>
      {phase ? (
        <AfterMerge ctx={ctx} gap={gap} phase={phase} now={state.now[gap.stage]} dispatch={dispatch} />
      ) : (
        <>
          <div className={styles.acts}>
            <Button variant={picked ? 'primary' : 'default'} aria-pressed={picked} title="Pick (P)" onClick={() => dispatch({ type: 'togglePick', id: gap.id })}>
              {picked ? 'Picked ✓' : 'Pick'}
            </Button>
            <span className={styles.aux}>{x.kind === 'mr' ? `+${gap.diffLines} lines · 1 MR · ${x.cls}` : 'reads only · no diff'}</span>
          </div>
          {x.kind === 'mr' ? <DiffView files={x.files} index={state.file[gap.id] ?? 0} onTab={(index) => dispatch({ type: 'file', id: gap.id, index })} /> : null}
          <dl className={styles.earn}>
            <dt>Earns</dt>
            <dd>{x.earns}</dd>
          </dl>
        </>
      )}
    </InspectorSection>
  );
}
