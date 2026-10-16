'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { useToast } from '@/components/overlays/toast/useToast';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { DEFAULT_NEEDS_ACTION, NEEDS_ACTIONS } from '@/lib/demo/needsActions';
import { decideLabel, needsMeta, waitingTitle } from '../../../model/inspector';
import type { NeedsSlice, ProjectAction } from '../../../model/project/view';
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

/** One button the server decided: a link, disabled with its reason as the tooltip, or (demo only) a simulated flash. */
function Action({ a, onFlash }: { a: ProjectAction; onFlash: (m: string) => void }) {
  if (a.kind === 'link') return <Button variant={a.variant} href={a.href}>{a.label}</Button>;
  if (a.kind === 'disabled') return <Button variant={a.variant} disabled title={a.reason}>{a.label}</Button>;
  return <Button variant={a.variant} onClick={() => onFlash(a.text)}>{a.label}</Button>;
}

/**
 * What waits for a person on this project (`needs`, decided on the server). The deep project lists its real decisions
 * (the button's tooltip says exactly what it does). Demo mode resolves one on a click, in this screen only. Live mode never
 * claims a decision was made here: the button opens Needs you, where the decision and the operator's write belong. Other
 * projects show a count, and a project not set up its setup; their `actions` say why they cannot act in live mode.
 */
export function NeedsYouSection({ p, needs, actions, live }: { p: FleetProject; needs: NeedsSlice; actions: ProjectAction[]; live: boolean }) {
  const onFlash = useToast().status;
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const onResolve = (id: string, does: string) => {
    setDone((d) => new Set(d).add(id));
    onFlash(does);
  };
  const unwatched = needs.kind === 'unwatched';
  let body;
  if (unwatched || needs.kind === 'count') {
    body = (
      <div className={styles.nyi}>
        <div className={styles.t}>{unwatched ? 'Not set up' : waitingTitle(needs.n, p.state === 'stale')}</div>
        <div className={styles.acts}>
          {actions.map((a) => (
            <Action key={a.label} a={a} onFlash={onFlash} />
          ))}
        </div>
      </div>
    );
  } else if (needs.kind === 'decisions' && needs.items.length) {
    body = needs.items.map((n) => <Decision key={n.id} n={n} done={done.has(n.id)} live={live} onResolve={onResolve} onFlash={onFlash} />);
  } else {
    body = <div className={styles.muted}>Nothing waiting</div>;
  }
  return (
    <DetailSection title="Needs you" aux={p.needsYou && !unwatched ? <NeedsYouBadge count={p.needsYou} /> : null}>
      {body}
    </DetailSection>
  );
}
