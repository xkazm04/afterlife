import type { OnboardApi } from '../hooks/useOnboard';

const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;

/** The status bar: "184 discovered · 155 watching · 12 wait for you · next batch 9 reads, 5 writes". */
export function OnboardStatus({ o }: { o: OnboardApi }) {
  const yours = o.batch.yours.length;
  return (
    <>
      {o.counts.discovered} discovered · {o.counts.watching} watching · {yours} {yours === 1 ? 'waits' : 'wait'} for you · next batch{' '}
      {n(o.batch.reads.length, 'read')}, {n(o.batch.writes.length, 'write')}
      {o.group ? ` · scope ${o.group}` : ''}
    </>
  );
}
