'use client';

import { useContext, useEffect, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { ToastContext } from '@/components/overlays/toast/useToast';
import { repollGroupAction } from '@/server/actions/repollAction';
import type { ShellPoll } from '../../ShellContext';
import { readAnswer } from '../../live/sync';
import styles from '../StatusBar.module.css';
import { pollLine, recheckDue } from './pollLine';

/**
 * The status bar's poll line (pollLine.ts): the age of the last good poll, ticking from the server's read; a failed
 * poll's reason; the projects that failed; and on a failure, Re-poll (one cycle of the whole group, repollGroupAction,
 * whose refresh() re-renders the layout with the fresh read). Before a healthy read ticks into "late", it asks
 * /api/shell once, so a page left open does not call a running poller late.
 */
export function PollStatus({ poll }: { poll: ShellPoll }) {
  const say = useContext(ToastContext)?.status;
  const [held, setHeld] = useState({ from: poll, poll, sec: 0 });
  if (held.from !== poll) setHeld({ from: poll, poll, sec: 0 }); // a new read from the server
  const [busy, setBusy] = useState(false);

  // The age ticks from the read it holds; the first tick that would call a healthy read late asks the server once.
  const shown = held.poll;
  useEffect(() => {
    const t0 = Date.now();
    let rechecked = false;
    const tick = () => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      setHeld((h) => (h.poll === shown ? { ...h, sec } : h));
      if (rechecked || !recheckDue(shown, sec)) return;
      rechecked = true;
      void readAnswer().then((info) => {
        const fresh = info?.data.poll;
        if (fresh) setHeld((h) => (h.poll === shown ? { ...h, poll: fresh, sec: 0 } : h));
      });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [shown]);

  const p = held.poll;
  const line = pollLine({ ...p, ageSec: p.ageSec === null ? null : p.ageSec + held.sec });
  const repoll = () => {
    setBusy(true);
    say?.('Re-polling the group…');
    repollGroupAction().then(
      (r) => say?.(r.ok ? 'Re-polled the group' : `Re-poll failed: ${r.reason}`),
      (e: unknown) => say?.(`Re-poll failed: ${e instanceof Error ? e.message : 'no answer'}`),
    ).finally(() => setBusy(false));
  };
  return (
    <span className={`${styles.poll} ${styles[line.tone]}`}>
      <span className={styles.pollText} title={line.text}>
        {line.text}
      </span>
      {line.repoll && (
        <Button size="mini" onClick={repoll} disabled={busy}>
          Re-poll
        </Button>
      )}
    </span>
  );
}
