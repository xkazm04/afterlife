'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/controls/Button';
import { measureLocalAction, measurePassiveAction } from '../../data/remeasure';
import type { AdjustmentRow, RemeasureResult } from '../../model/types';
import styles from '../write/write.module.css';

/**
 * How Afterlife re-measures a claim here: from the variant's natural runs, from N runs queued for it (a write as you:
 * its sheet previews the exact commands), or locally with the project's frontier metric. Each answers in words; a
 * measurement it appends shows in the section above on the re-read.
 */
export function AdjustmentActions({ slug, row, onQueue }: { slug: string; row: AdjustmentRow; onQueue: (row: AdjustmentRow) => void }) {
  const r = row.remeasure;
  const [said, setSaid] = useState<string | undefined>(undefined);
  const [busy, start] = useTransition();
  if (!r) return <p className={styles.said}>No re-measure fits this claim here: it names no variant Afterlife collects, nor a frontier metric of the project.</p>;
  const ask = (call: (slug: string, id: string) => Promise<RemeasureResult>) =>
    start(async () => {
      const a = await call(slug, row.claim.id).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      setSaid(a.ok ? a.message : `Not measured: ${a.error}`);
    });
  return (
    <>
      <div className={styles.actions}>
        {r.passive ? (
          <Button size="mini" disabled={busy} onClick={() => ask(measurePassiveAction)} title="Compare the variant's 5 runs before the change with the first 5 after it">
            Measure passively
          </Button>
        ) : null}
        {r.queue ? (
          <Button size="mini" disabled={busy} onClick={() => onQueue(row)} title={`Queue runs of the pipeline on ${r.queue.branch}: shows the exact commands first`}>
            Queue N runs…
          </Button>
        ) : null}
        {r.local ? (
          <Button size="mini" disabled={busy} onClick={() => ask(measureLocalAction)} title="Run the project's frontier metric on base and on the change, in throwaway worktrees">
            Measure locally
          </Button>
        ) : null}
      </div>
      {said ? <p className={styles.said} role="status">{said}</p> : null}
    </>
  );
}
