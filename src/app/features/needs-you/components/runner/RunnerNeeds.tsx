import Link from 'next/link';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Chip } from '@/components/status/chip/Chip';
import { usd } from '@/app/features/runs/model/format';
import { plural } from '@/lib/format/plural';
import type { MergeNeed, ParkNeed, RunnerNeed } from '@/lib/runs/desk/types';
import styles from './runner.module.css';

function Merge({ n }: { n: MergeNeed }) {
  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <Chip compact>Take a wave</Chip>
        <b>
          Wave {n.wave} of {n.repo}
        </b>
        <span className={styles.dim}>
          {plural(n.landed, 'lane')} landed · {usd(n.costUsd)} · {n.branch} into {n.base}
        </span>
      </div>
      <div className={styles.does}>
        Every lane on the branch passed the repo&apos;s gates. Read it, then take it yourself: Afterlife merges and pushes nothing.
        {n.path ? '' : ' The repo is not in .afterlife/fleet.yml, so run these from its checkout.'}
        {n.checked ? '' : ' Git could not be asked whether it is in already.'}
      </div>
      <CommandBlock commands={n.commands} label={`Merge ${n.branch}`} />
    </li>
  );
}

function Park({ n }: { n: ParkNeed }) {
  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <Chip compact>Parked lane</Chip>
        <b>{n.title ?? n.lane}</b>
        <span className={styles.dim}>
          {n.repo} · wave {n.wave} · lane {n.lane}
        </span>
      </div>
      {n.parkReason ? <div>{n.parkReason}</div> : null}
      <div className={styles.does}>
        The lane stopped for a person instead of guessing. Answer it in the repo, or leave it: the next wave&apos;s plan sees
        it and may try again only with a new approach.
      </div>
    </li>
  );
}

/** The runner's cards, a merge card per wave and a park card per lane: the empty pages' strip and the desks' sheet. */
export function RunnerCards({ needs }: { needs: readonly RunnerNeed[] }) {
  return <ul className={styles.list}>{needs.map((n) => (n.kind === 'merge-wave' ? <Merge key={n.id} n={n} /> : <Park key={n.id} n={n} />))}</ul>;
}

/**
 * The decisions the cycle runner left: a mergeable wave not yet in its base, and the lanes its newest wave parked. Read
 * from .afterlife (real local data in demo and live alike); nothing here writes. Draws nothing when nothing waits. The empty
 * pages draw the cards in place; the desks fold them into a one-line `RunnerStrip` that opens them in a sheet.
 */
export function RunnerNeeds({ needs }: { needs: readonly RunnerNeed[] }) {
  if (!needs.length) return null;
  return (
    <section className={styles.strip} aria-label="From the cycle runner">
      <h2 className={styles.title}>
        From the cycle runner <span className={styles.dim}>{plural(needs.length, 'decision')} · <Link href="/runs">runs</Link></span>
      </h2>
      <RunnerCards needs={needs} />
    </section>
  );
}
