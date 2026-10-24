'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { ToastContext } from '@/components/overlays/toast/useToast';
import type { ShellPoll } from '../../ShellContext';
import styles from '../StatusBar.module.css';
import { pollLine, recheckDue } from './pollLine';

/** One cycle of the whole group; live it is repollGroupAction. */
export type PollRepoll = () => Promise<{ ok: true } | { ok: false; reason: string }>;
/** One read of the server's poll health; null or undefined when there is no answer. Live it reads /api/shell. */
export type PollRecheck = () => Promise<ShellPoll | null | undefined>;

/**
 * PollStatus with its two reads injected: it holds the poll, ticks its age, asks `recheck` once before a healthy read
 * ticks into "late", and on a failure offers Re-poll, which runs `repoll` and says the outcome in a toast. It does no
 * I/O of its own, so /kit draws it with stand-ins and polls nothing.
 */
export function PollStatusView({ poll, repoll, recheck }: { poll: ShellPoll; repoll: PollRepoll; recheck: PollRecheck }) {
  const say = useContext(ToastContext)?.status;
  const [held, setHeld] = useState({ from: poll, poll, sec: 0 });
  if (held.from !== poll) setHeld({ from: poll, poll, sec: 0 }); // a new read from the server
  const [busy, setBusy] = useState(false);
  // The latest recheck, read at tick time: a caller passing a fresh function each render does not restart the clock.
  const recheckRef = useRef(recheck);
  useEffect(() => {
    recheckRef.current = recheck;
  });

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
      void recheckRef.current().then((fresh) => {
        if (fresh) setHeld((h) => (h.poll === shown ? { ...h, poll: fresh, sec: 0 } : h));
      });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [shown]);

  const p = held.poll;
  const line = pollLine({ ...p, ageSec: p.ageSec === null ? null : p.ageSec + held.sec });
  const onRepoll = () => {
    setBusy(true);
    say?.('Re-polling the group…');
    repoll().then(
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
        <Button size="mini" onClick={onRepoll} disabled={busy}>
          Re-poll
        </Button>
      )}
    </span>
  );
}
