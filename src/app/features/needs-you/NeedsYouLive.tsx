import type { NeedsYouItem } from '@/lib/demo';
import { Chip } from '@/components/status/chip/Chip';
import empty from './NeedsYouEmpty.module.css';
import styles from './NeedsYouLive.module.css';

const KIND: Readonly<Record<string, string>> = {
  promote: 'Extend trust',
  signoff: 'CRA sign-off',
  gaps: 'Maturity gaps',
  readmit: 'Re-admit',
  setup: 'Setup',
};

/**
 * Live mode: the open inbox items the poller found in your group, as the index holds them. Server component. The desk
 * (the demo's five items, the !44 incident, the patch-bump record) is never drawn here, nor any item the demo seeded.
 */
export function NeedsYouLive({ items, seeded }: { items: readonly NeedsYouItem[]; seeded: number }) {
  return (
    <main className={empty.page}>
      <h1 className={empty.title}>Needs you</h1>
      <p>
        {items.length} {items.length === 1 ? 'decision waits' : 'decisions wait'} for a person, read from your GitLab group by the last poll.
      </p>
      <ul className={styles.list}>
        {items.map((n) => (
          <li key={n.id} className={styles.item}>
            <div className={styles.head}>
              <Chip compact>{KIND[n.kind] ?? n.kind}</Chip>
              <b className={styles.title}>{n.title}</b>
              {n.dueIn ? <span className={styles.due}>due in {n.dueIn}</span> : null}
            </div>
            {n.reason ? <div>{n.reason}</div> : null}
            <div className={empty.note}>{n.does}</div>
          </li>
        ))}
      </ul>
      <p className={empty.note}>
        Act on these in GitLab or from the Ladder for now: this list does not send anything.
        {seeded ? ` ${seeded} demo item(s) seeded into this index are not shown: they are not your group's.` : ''}
      </p>
    </main>
  );
}
