import { Unread } from '@/components/shell/host';
import { pluralWord } from '@/lib/format/plural';
import type { TiersStale as Stale } from '@/server/data/types';
import type { Head } from '../../model/types';
import { HeadStatus } from './HeadStatus';

/**
 * The list's status line: how many classes show of how many, the filters set, then the head and the poll age
 * (HeadStatus). Before the classes are read (`unread`) the counts and the head are a dash, never 0.
 */
export function LadderStatus({ shown, total, filters, unread, head, stale, live, elapsed, feedAgeSec }: {
  shown: number;
  total: number;
  filters: number;
  unread: boolean;
  head: Head;
  stale: Stale | null;
  live: boolean;
  elapsed: number;
  feedAgeSec: number | null;
}) {
  if (unread) {
    return (
      <>
        <Unread label="classes not read yet" /> classes · {filters} {pluralWord(filters, 'filter')} · tier-state.yml @ <Unread label="head not read yet" /> ·{' '}
        <Unread label="poll age not read yet" />
      </>
    );
  }
  return (
    <>
      {shown === total ? total : `${shown} of ${total}`} classes · {filters} {pluralWord(filters, 'filter')} ·{' '}
      <HeadStatus head={head} stale={stale} live={live} elapsed={elapsed} feedAgeSec={feedAgeSec} />
    </>
  );
}
