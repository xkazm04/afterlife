import type { OnboardApi } from '../hooks/useOnboard';

/** The status bar: "184 discovered · 155 watching · 12 wait for you · next batch 9 reads, 5 writes". */
export function OnboardStatus({ o }: { o: OnboardApi }) {
  return (
    <>
      {o.counts.discovered} discovered · {o.counts.watching} watching · {o.batch.yours.length} wait for you · next batch {o.batch.reads.length} reads,{' '}
      {o.batch.writes.length} writes{o.group ? ` · scope ${o.group}` : ''}
    </>
  );
}
