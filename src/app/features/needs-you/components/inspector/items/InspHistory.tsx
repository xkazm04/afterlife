import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { KeyValue } from '@/components/inspector/KeyValue';
import { KIND_WORDS } from '../../../data/week';
import { histRow } from '../../../model/rows/history';
import type { InspProps } from '../props';
import { Sec } from '../Sec';

/** A ledger row from "Decided this week". The earlier ones are illustrative; this session's are real clicks. */
export function InspHistory({ id, ...p }: InspProps & { id: string }) {
  const r = histRow(p.s, id);
  if (!r) return null;
  return (
    <>
      <InspectorHeader title={r.what} sub={`${KIND_WORDS[r.kind] ?? r.kind} · ${r.when}`} />
      <Sec k="h-rec" title="Ledger record" aux={r.fresh ? 'this session' : 'illustrative'} p={p}>
        <KeyValue rows={[['Decision', r.result], ['Write', r.ref], ['When', r.when]]} />
      </Sec>
    </>
  );
}
