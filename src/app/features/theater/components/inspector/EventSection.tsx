import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { LedgerFacts } from '../../model/types';

/** A real film's entry: every fact its belay-ledger event states (an absent key has no row), and nothing else. */
export function EventSection({ seq, ev }: { seq: number; ev: LedgerFacts }) {
  return (
    <InspectorSection title="Ledger event" aux="belay-ledger">
      <KeyValue
        rows={[...ev.facts.map((f) => [f.label, f.value] as const), ['Seq', String(seq)]]}
      />
    </InspectorSection>
  );
}
