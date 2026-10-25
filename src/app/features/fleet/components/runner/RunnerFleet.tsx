import Link from 'next/link';
import { outcomeWords, tokens, usd } from '@/app/features/runs/model/format';
import { plural } from '@/lib/format/plural';
import type { RunnerDesk, RunnerRow } from '@/lib/runs/desk/types';
import styles from './runner.module.css';

/** A row's newest wave in words: what a person would ask of it first. */
export function lastWords(r: RunnerRow): string {
  const w = r.last;
  if (!w) return 'no runs yet';
  if (w.running) return `wave ${w.wave} running`;
  if (w.proposed !== undefined) return `wave ${w.wave} proposed ${w.proposed}, changed nothing`;
  if (!w.mergeable) return `wave ${w.wave} not mergeable`;
  if (w.merged === undefined) return `wave ${w.wave} mergeable`;
  return w.merged ? `wave ${w.wave} merged` : `wave ${w.wave} to merge`;
}

function fleetNote(d: RunnerDesk): string | null {
  if (d.fleet === 'missing') return 'No .belay/fleet.yml: copy runner/fleet.example.yml there and point each path at its checkout.';
  if (d.fleet === 'invalid') return `.belay/fleet.yml does not read: ${d.fleetError ?? 'unknown reason'}.`;
  return null;
}

/**
 * Fleet's strip for the cycle runner: every repo of .belay/fleet.yml (and any repo that still has runs) with its newest
 * wave, what its waves spent and the decisions they left. Real local data in demo and live alike, read on the server.
 * Read-only: the runs are on /runs, the decisions on /needs-you. `unmatched`: the repos whose spend matched no Fleet
 * project (src/lib/runs/desk/join.ts), said "not in Fleet" rather than dropped.
 */
export function RunnerFleet({ desk, unmatched = [] }: { desk: RunnerDesk; unmatched?: readonly string[] }) {
  const note = fleetNote(desk);
  const spent = desk.rows.reduce<number | undefined>((s, r) => (r.costUsd === undefined ? s : (s ?? 0) + r.costUsd), undefined);
  return (
    <details className={styles.strip} aria-label="Cycle runner">
      <summary className={styles.sum}>
        <b>Cycle runner</b>
        <span>{plural(desk.rows.length, 'repo')}</span>
        <span>{usd(spent)} spent</span>
        {desk.needs.length ? (
          <Link href="/needs-you" className={styles.needs}>
            {desk.needs.length} to decide
          </Link>
        ) : (
          <span className={styles.dim}>nothing to decide</span>
        )}
        {unmatched.length ? <span title={unmatched.join(', ')}>{unmatched.length} not in Fleet</span> : null}
        <Link href="/runs" className={styles.dim}>
          runs
        </Link>
      </summary>
      {note ? <p className={styles.note}>{note}</p> : null}
      {unmatched.length ? (
        <p className={styles.note}>
          Not in Fleet: {unmatched.join(', ')}. Their spend is on no project: give each a <code>gitlab:</code> path in .belay/fleet.yml, or a slug equal to its Fleet id.
        </p>
      ) : null}
      {desk.rows.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Repo</th>
              <th>Checkout</th>
              <th>Newest wave</th>
              <th>Its lanes</th>
              <th>Waves</th>
              <th>Tokens</th>
              <th>Spent</th>
              <th>To decide</th>
            </tr>
          </thead>
          <tbody>
            {desk.rows.map((r) => (
              <tr key={r.slug}>
                <td>{r.slug}</td>
                <td className={styles.path} title={r.path}>
                  {r.inFleet ? `${r.path} · ${r.base}` : 'not in the fleet file'}
                </td>
                <td>{lastWords(r)}</td>
                <td>{r.last ? outcomeWords(r.last.counts, r.last.open) : '-'}</td>
                <td>{r.waves}</td>
                <td>{tokens(r.tokens)}</td>
                <td>{usd(r.costUsd)}</td>
                <td>{r.needs || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </details>
  );
}
