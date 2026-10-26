import { Unread } from '@/components/shell/host';
import { Stats, type StatTone } from '@/components/inspector/blocks/Stats';
import stats from '@/components/inspector/blocks/Stats.module.css';

/**
 * The summary strip's big numbers when some are not read yet (live, before the tracks or the steps land): the same
 * row as Stats, a dash in quiet ink for each unread one. Never a zero, and never a toned (amber) dash: an unread count
 * is unknown, not waiting for you. All read: the plain Stats row.
 */
export function UnreadStats({ cells }: { cells: readonly { n: number | null; label: string; tone?: StatTone }[] }) {
  if (cells.every((c) => c.n !== null)) return <Stats cells={cells as { n: number; label: string; tone?: StatTone }[]} />;
  return (
    <div className={stats.prf}>
      {cells.map((c, i) => (
        <div key={`${i}:${c.label}`} className={`${stats.cell} ${c.n === null ? '' : (stats[c.tone ?? 'plain'] ?? '')}`}>
          <b>{c.n === null ? <Unread label={`${c.label}: not read yet`} /> : c.n}</b>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
