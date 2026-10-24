'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { fleetHref } from '@/lib/url/fleetHref';
import { decisionsWord, liveNeeds } from '../../model/totals';
import { DecisionRow } from './decisions/DecisionRow';
import rows from './decisions/decisions.module.css';
import styles from './inspector.module.css';

/**
 * The items to act on, for the selected beat. The deep project lists its real decisions as dense rows, one open at a time to
 * what it does and its decide buttons (none listed: it reads like any other project). Demo resolves one on a click; live
 * claims nothing: the button opens Needs you, where it is decided; another project says how many wait and where to take them.
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
  // The one open row (none at first): opening another shuts it.
  const [openId, setOpenId] = useState<string | null>(null);
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
  } else if (isDeep && needs.length) {
    body = (
      <div className={rows.list}>
        {needs.map((d) => (
          <DecisionRow
            key={d.id}
            d={d}
            open={openId === d.id}
            live={live}
            done={done.has(d.id)}
            onToggle={() => setOpenId((o) => (o === d.id ? null : d.id))}
            onResolve={onResolve}
            onFlash={onFlash}
          />
        ))}
      </div>
    );
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
          <Button href={fleetHref(p.id)}>Show in Fleet</Button>
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
