import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { LedgerFacts } from '../../model/types';

/** A real film's entry: what its belay-ledger event states, and nothing else. */
export function EventSection({ seq, ev }: { seq: number; ev: LedgerFacts }) {
  return (
    <InspectorSection title="Ledger event" aux="belay-ledger">
      <KeyValue
        rows={[
          ['Kind', ev.kind],
          ['Class', ev.actionClass],
          ['Tier at the time', ev.tier],
          ...(ev.verdict ? [['Verdict', ev.verdict] as const] : []),
          ['MR', `!${ev.iid}`],
          ['Seq', String(seq)],
          ['At', ev.at],
          ['Hash', `${ev.hash}…`],
        ]}
      />
    </InspectorSection>
  );
}
