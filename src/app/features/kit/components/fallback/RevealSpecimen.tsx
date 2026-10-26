'use client';

import { useState } from 'react';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Reveal, SliceFixture, Unread } from '@/components/shell/host';
import styles from './FallbackGallery.module.css';

const ROWS = [
  { name: 'ledgerline', proofs: '31 of 34' },
  { name: 'tollgate', proofs: '12 of 12' },
];

function Regions({ read }: { read: boolean }) {
  return (
    <div className={styles.regions}>
      <Reveal order={1} slice="core" className={styles.region}>
        <b>Projects</b> {read ? '2' : <Unread label="projects not read yet" />}
      </Reveal>
      <Reveal order={2} slice="core" className={styles.region}>
        {ROWS.map((r) => (
          <span key={r.name} className={styles.row}>
            {r.name} · {read ? r.proofs : <Unread label="proofs not read yet" />}
          </span>
        ))}
      </Reveal>
      <Reveal order={3} slice="desk" className={styles.region}>
        <b>Spend</b> <Unread label="spend not read yet" />
      </Reveal>
    </div>
  );
}

/**
 * The screen host's frame-first look: every region is drawn from the first frame, an em dash where a value is not read
 * (never 0, never blank), and each region settles in, in order, when its slice lands. "Land core" pins the core slice
 * read (the desk stays unread); "Replay" draws the regions again from unread.
 */
export function RevealSpecimen() {
  const [read, setRead] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <div className={styles.reveal}>
      <div className={styles.bar}>
        <ToolbarButton pressed={read} onClick={() => setRead(true)}>
          Land core
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setRead(false);
            setRound((r) => r + 1);
          }}
        >
          Replay
        </ToolbarButton>
      </div>
      <SliceFixture key={round} slices={read ? { core: true } : {}}>
        <Regions read={read} />
      </SliceFixture>
    </div>
  );
}
