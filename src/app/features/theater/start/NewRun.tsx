'use client';

import { useState, type ReactNode } from 'react';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Sheet } from '@/components/overlays/Sheet';
import { Card } from '@/components/surface/Card';
import type { StartData } from '@/server/actions/runs/start/types';
import { StartPanel } from './StartPanel';
import styles from './start.module.css';

const SUBTITLE = 'your claude login · Preview shows the exact command · nothing runs until Start run';

/** The live film's entry with no run live: the panel, inline, under the last wave. */
export function StartCard({ data }: { data: StartData }) {
  return (
    <Card className={styles.card} role="region" aria-label="Start a run">
      <h2>Start a run</h2>
      <p className={styles.dim}>{SUBTITLE}</p>
      <StartPanel data={data} />
    </Card>
  );
}

/**
 * The toolbar's "New run…" and the sheet it opens, anytime, on either film. Render `button` in the toolbar and `sheet`
 * inside the Window's content (a Sheet positions itself in the pane). Without data (a test, a page that read none)
 * there is no button.
 */
export function useNewRun(data: StartData | undefined): { button: ReactNode; sheet: ReactNode } {
  const [open, setOpen] = useState(false);
  if (!data) return { button: null, sheet: null };
  return {
    button: (
      <ToolbarButton title="Start a cycle run: propose or execute, on a new or an existing branch" onClick={() => setOpen(true)} aria-haspopup="dialog">
        New run…
      </ToolbarButton>
    ),
    sheet: open ? (
      <Sheet title="Start a run" subtitle={SUBTITLE} onClose={() => setOpen(false)}>
        <StartPanel data={data} />
      </Sheet>
    ) : null,
  };
}
