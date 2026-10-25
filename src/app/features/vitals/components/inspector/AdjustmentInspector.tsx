import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { Chip } from '@/components/status/chip/Chip';
import { measuredPct, targetWords } from '../../model/adjustments';
import { signedPct } from '../../model/format';
import type { AdjustmentRow } from '../../model/types';
import styles from '../../vitals.module.css';
import { STATE_TONE } from '../bands/AdjustmentsBand';
import { AdjustmentActions } from './AdjustmentActions';

/**
 * A picked adjustment: the claim as made (the agent's figures, labelled as theirs) and, beside it, Afterlife's own
 * latest measurement and its verdict. The verdict reads the measurement alone.
 */
export function AdjustmentInspector({ row, slug, onQueue }: { row: AdjustmentRow; slug: string; onQueue: (row: AdjustmentRow) => void }) {
  const c = row.claim;
  const m = row.measurement;
  const ref = [c.ref.branch, c.ref.mr, c.ref.sha].filter(Boolean).join(' · ');
  return (
    <>
      <InspectorHeader title={c.title} sub={<Chip compact tone={STATE_TONE[row.state]}>{row.state}</Chip>} />
      <InspectorSection title="Agent’s claim" aux={c.by}>
        <KeyValue
          rows={[
            ['target', targetWords(c.target)],
            ['direction', c.direction],
            ['expected', c.expectedPct === undefined ? null : `${c.direction === 'down' ? '-' : '+'}${c.expectedPct}%`],
            ['agent’s figure', c.agentValue === undefined ? null : String(c.agentValue)],
            ['ref', ref || null],
            ['claimed', c.at],
          ]}
        />
        <p className={styles.note}>The agent’s claim is shown, never used in the verdict.</p>
      </InspectorSection>
      <InspectorSection title="Afterlife’s measurement" aux={m ? `${row.measurements} taken` : 'none yet'}>
        {m ? (
          <>
            <KeyValue
              rows={[
                ['method', m.method],
                ['base median', `${m.base.median} (n ${m.base.n}, spread ${m.base.spread})`],
                ['head median', `${m.head.median} (n ${m.head.n}, spread ${m.head.spread})`],
                ['change', signedPct(measuredPct(m))],
                ['tolerance', `${Math.round(m.tolerance * 100)}%`],
                ['verdict', m.verdict],
                ['measured', m.at],
              ]}
            />
            <p className={styles.note}>{m.reason}</p>
          </>
        ) : (
          <p className={styles.note}>Proposed: Afterlife has not measured this yet, so nothing is credited.</p>
        )}
      </InspectorSection>
      <InspectorSection title="Re-measure">
        <AdjustmentActions slug={slug} row={row} onQueue={onQueue} />
      </InspectorSection>
    </>
  );
}
