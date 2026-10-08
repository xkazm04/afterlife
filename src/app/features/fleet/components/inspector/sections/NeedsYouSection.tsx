'use client';

import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { DEFAULT_NEEDS_ACTION, NEEDS_ACTIONS } from '@/lib/demo/needsActions';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { decideLabel, gitlabUrl, needsMeta, waitingTitle } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

function Decision({
  n,
  done,
  live,
  onResolve,
  onFlash,
}: {
  n: NeedsYouItem;
  done: boolean;
  live: boolean;
  onResolve: (needId: string, does: string) => void;
  onFlash: (m: string) => void;
}) {
  const [primary, quiet] = NEEDS_ACTIONS[n.id] ?? DEFAULT_NEEDS_ACTION;
  const meta = needsMeta(n);
  return (
    <div className={styles.nyi}>
      <div className={styles.t}>{n.title}</div>
      {meta ? <div className={styles.m}>{meta}</div> : null}
      <div className={styles.acts}>
        {live ? (
          <Button variant="primary" href="/needs-you" title={`Opens Needs you, where this is decided; nothing is decided here. ${n.does}`}>
            {decideLabel(primary)}
          </Button>
        ) : done ? (
          <span className={styles.done}>✓ Done</span>
        ) : (
          <>
            <Button variant="primary" title={n.does} onClick={() => onResolve(n.id, n.does)}>
              {primary}
            </Button>
            <Button onClick={() => onFlash(`Deferred: ${n.title}`)}>{quiet}</Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * What waits for a person on this project. The deep project lists its real decisions (the button's tooltip says exactly
 * what it does). Demo mode resolves one on a click, in this screen only. Live mode never claims a decision was made here:
 * the button opens Needs you, where the decision and the operator's write belong. Other watched projects show a count
 * and two demo actions.
 */
export function NeedsYouSection({
  p,
  portfolio,
  deep,
  live,
  done,
  onResolve,
  onFlash,
  sec,
}: {
  p: FleetProject;
  portfolio: string;
  deep: DeepProject;
  live: boolean;
  done: ReadonlySet<string>;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
  sec: SectionProps;
}) {
  const unwatched = p.state === 'not-set-up';
  let body;
  if (unwatched) {
    body = (
      <div className={styles.nyi}>
        <div className={styles.t}>Not set up</div>
        <div className={styles.acts}>
          <Button variant="accent" onClick={() => onFlash(`Setup opens a bootstrap MR in ${p.name} (demo)`)}>
            Set up…
          </Button>
        </div>
      </div>
    );
  } else if (p.id === deep.id && !deep.needs.length) {
    body = <div className={styles.muted}>Nothing waiting</div>;
  } else if (p.id === deep.id) {
    body = deep.needs.map((n) => <Decision key={n.id} n={n} done={done.has(n.id)} live={live} onResolve={onResolve} onFlash={onFlash} />);
  } else if (p.needsYou) {
    body = (
      <div className={styles.nyi}>
        <div className={styles.t}>{waitingTitle(p.needsYou, p.state === 'stale')}</div>
        <div className={styles.acts}>
          <Button variant="primary" onClick={() => onFlash(`Opening the queue for ${p.name} (demo)`)}>
            Review queue
          </Button>
          <Button onClick={() => onFlash(`${gitlabUrl(`${portfolio}/${p.group}/${p.id}`)} (demo, no network)`)}>Open in GitLab</Button>
        </div>
      </div>
    );
  } else {
    body = <div className={styles.muted}>Nothing waiting</div>;
  }
  return (
    <InspectorSection title="Needs you" aux={p.needsYou && !unwatched ? <NeedsYouBadge count={p.needsYou} /> : null} {...sec}>
      {body}
    </InspectorSection>
  );
}
