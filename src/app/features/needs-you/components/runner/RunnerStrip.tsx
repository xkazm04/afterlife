'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { Sheet } from '@/components/overlays/Sheet';
import { plural } from '@/lib/format/plural';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { RunnerCards } from './RunnerNeeds';
import styles from './runner.module.css';

/** "2 merges · 1 parked": the waves to take and the lanes parked, a zero part left out. */
export function runnerCounts(needs: readonly RunnerNeed[]): string {
  const merges = needs.filter((n) => n.kind === 'merge-wave').length;
  const parked = needs.length - merges;
  return [merges ? plural(merges, 'merge') : '', parked ? `${parked} parked` : ''].filter(Boolean).join(' · ');
}

/** One line above the desk's band: what the cycle runner left and Open. Draws nothing when nothing waits. */
export function RunnerStrip({ needs, onOpen }: { needs: readonly RunnerNeed[]; onOpen: () => void }) {
  if (!needs.length) return null;
  return (
    <section className={styles.line} aria-label="From the cycle runner">
      <b>From the cycle runner</b>
      <span className={styles.counts}>· {runnerCounts(needs)}</span>
      <Button size="mini" aria-haspopup="dialog" title="Read the runner's merges and parked lanes" onClick={onOpen}>
        Open
      </Button>
    </section>
  );
}

/** The runner's cards in a sheet over the pane. Escape or the veil closes it, and focus goes back to Open. */
export function RunnerSheet({ needs, onClose }: { needs: readonly RunnerNeed[]; onClose: () => void }) {
  return (
    <Sheet
      title="From the cycle runner"
      subtitle={
        <>
          <span>{runnerCounts(needs)}</span>
          <span aria-hidden="true">·</span>
          <Link href="/runs">runs</Link>
        </>
      }
      onClose={onClose}
      footer={
        <>
          <Spacer />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <RunnerCards needs={needs} />
    </Sheet>
  );
}

/**
 * The desk's runner strip and its sheet, as two nodes to place: `strip` at the top of the page's PaneScroll, `sheet`
 * beside the PaneScroll in the pane (a Sheet sits in its nearest positioned ancestor, and inside the scroller it would
 * scroll away with the page). No sheet is drawn while nothing waits.
 */
export function useRunnerStrip(needs: readonly RunnerNeed[]): { strip: ReactNode; sheet: ReactNode } {
  const [open, setOpen] = useState(false);
  return {
    strip: <RunnerStrip needs={needs} onOpen={() => setOpen(true)} />,
    sheet: open && needs.length ? <RunnerSheet needs={needs} onClose={() => setOpen(false)} /> : null,
  };
}
