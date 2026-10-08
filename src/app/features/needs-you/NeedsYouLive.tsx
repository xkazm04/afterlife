'use client';

import type { NeedsYouItem } from '@/lib/demo';
import { Chip } from '@/components/status/chip/Chip';
import { LiveAct } from './components/live/LiveAct';
import { useLiveActs, type LiveActs } from './hooks/useLiveActs';
import empty from './NeedsYouEmpty.module.css';
import styles from './NeedsYouLive.module.css';

const KIND: Readonly<Record<string, string>> = {
  promote: 'Extend trust',
  signoff: 'CRA sign-off',
  gaps: 'Maturity gaps',
  readmit: 'Re-admit',
  setup: 'Setup',
};

export interface NeedsYouLiveProps {
  items: readonly NeedsYouItem[];
  seeded: number;
  /** The project the items belong to: the id the server actions plan the writes for. */
  project: string;
}

/**
 * Live mode: the open inbox items the poller found in your group, as the index holds them. The desk (the demo's five
 * items, the !44 incident, the patch-bump record) is never drawn here, nor any item the demo seeded. A promotion or a
 * re-admit has one action, a policy MR through the server actions; the rest are read-only and say where to act.
 */
export function NeedsYouLive({ items, seeded, project }: NeedsYouLiveProps) {
  return <NeedsYouLiveView items={items} seeded={seeded} acts={useLiveActs(items, project)} />;
}

/** The list for a given state of the acts (split from the hook so the screen can be rendered in a test). */
export function NeedsYouLiveView({ items, seeded, acts }: { items: readonly NeedsYouItem[]; seeded: number; acts: LiveActs }) {
  // a done write's item leaves `items` on the refresh; it stays here, with the response's answer, outside the rows
  const sentGone = Object.values(acts.sent).filter((n) => !items.some((i) => i.id === n.id));
  return (
    <main className={empty.page}>
      <h1 className={empty.title}>Needs you</h1>
      <p>
        {items.length} {items.length === 1 ? 'decision waits' : 'decisions wait'} for a person, read from your GitLab group by the last poll.
      </p>
      {sentGone.length ? (
        <section aria-label="Sent this session">
          <h2 className={styles.sentTitle}>Sent this session</h2>
          <ul className={styles.list}>
            {sentGone.map((n) => (
              <li key={n.id} className={styles.item}>
                <b className={styles.title}>{n.title}</b>
                <div role="status" className={styles.sent}>{acts.answers[n.id]?.text}</div>
                <div className={empty.note}>A person merges the MR in GitLab; the proposal leaves the list when the poll sees it closed.</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className={styles.list}>
        {items.map((n) => {
          const open = acts.sel === n.id;
          return (
            <li key={n.id} className={`${styles.item} ${open ? styles.open : ''}`}>
              <button type="button" className={styles.head} aria-expanded={open} onClick={() => acts.select(open ? null : n.id)}>
                <Chip compact>{KIND[n.kind] ?? n.kind}</Chip>
                <b className={styles.title}>{n.title}</b>
                {n.dueIn ? <span className={styles.due}>due in {n.dueIn}</span> : null}
              </button>
              {n.reason ? <div>{n.reason}</div> : null}
              <div className={empty.note}>{n.does}</div>
              {open ? (
                <LiveAct
                  item={n}
                  intent={acts.intentOf(n.id)}
                  view={acts.views[n.id]}
                  answer={acts.answers[n.id]}
                  sending={acts.sending === n.id}
                  onRun={() => acts.run(n.id)}
                  onRetry={() => acts.retry(n.id)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={empty.note}>
        A promotion or a re-admit sends one thing, on Run: a policy MR in belay-policy, as your glab login, exactly as shown. A person
        merges it in GitLab. Sign-offs, gaps and setup steps are read-only here.
        {seeded ? ` ${seeded} demo item(s) seeded into this index are not shown: they are not your group's.` : ''}
      </p>
    </main>
  );
}
