'use client';

import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { DEFAULT_NEEDS_ACTION, NEEDS_ACTIONS } from '@/lib/demo/needsActions';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { decisionsWord, liveNeeds } from '../../model/totals';
import styles from './inspector.module.css';

/**
 * The items to act on, for the selected beat. The deep project lists its real decisions. Demo resolves one on a click
 * (the button's tooltip says what it does); live claims nothing: the button opens Needs you, where it is decided; another project says how many wait and where to take them.
 */
export function Decisions({
  p,
  isDeep,
  needs,
  live,
  done,
  onResolve,
  onFlash,
  onRepoll,
}: {
  p: FleetProject;
  isDeep: boolean;
  needs: readonly NeedsYouItem[];
  live: boolean;
  done: ReadonlySet<string>;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
  onRepoll: (id: string) => void;
}) {
  const n = liveNeeds(p);
  let body;
  if (p.state === 'not-set-up') {
    body = (
      <div className={styles.item}>
        <div className={styles.t}>Not watched: what waits here is unknown</div>
        <div className={styles.acts}>
          <Button variant="accent" href="/setup">
            Set up…
          </Button>
        </div>
      </div>
    );
  } else if (isDeep) {
    body = needs.map((d) => {
      const [primary, quiet] = NEEDS_ACTIONS[d.id] ?? DEFAULT_NEEDS_ACTION;
      return (
        <div key={d.id} className={styles.item}>
          <div className={styles.t}>{d.title}</div>
          <div className={styles.acts}>
            {live ? (
              <Button variant="primary" href="/needs-you" title={`Opens Needs you, where this is decided; nothing is decided here. ${d.does}`}>
                Decide in Needs you…
              </Button>
            ) : done.has(d.id) ? (
              <span className={styles.done}>✓ Done</span>
            ) : (
              <>
                <Button variant="primary" title={d.does} onClick={() => onResolve(d.id, d.does)}>
                  {primary}
                </Button>
                <Button onClick={() => onFlash(`Deferred: ${d.title}`)}>{quiet}</Button>
              </>
            )}
          </div>
        </div>
      );
    });
  } else if (n) {
    body = (
      <div className={styles.item}>
        <div className={styles.t}>
          {decisionsWord(n)}
          {p.state === 'stale' ? ' (last known)' : ''}
        </div>
        <div className={styles.acts}>
          <Button variant="primary" href="/needs-you">
            Review in Needs you
          </Button>
          <Button href="/fleet">Show in Fleet</Button>
        </div>
      </div>
    );
  } else {
    body = <div className={styles.muted}>Nothing waits for you here</div>;
  }
  return (
    <InspectorSection title="Waiting for you" aux={n ? <NeedsYouBadge count={n} variant={p.state === 'stale' ? 'last-known' : 'live'} /> : null}>
      {body}
      {p.state === 'stale' ? (
        <div className={styles.acts}>
          <Button onClick={() => onRepoll(p.id)}>Re-poll feed</Button>
        </div>
      ) : null}
    </InspectorSection>
  );
}
