'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SliceFixture } from '@/components/shell/host';
import { hostRevalidate } from '@/components/shell/host/hooks/navigation';
import { requestShellRead } from '@/components/shell/live/sync';
import { useShellInfo } from '@/components/shell/ShellContext';
import { useGateFacts } from './components/useGateFacts';
import { TraceScreen } from './TraceScreen';
import styles from './components/trace.module.css';

/**
 * The (app) layout's gate, on the client: live mode before the first poll (the shell's read says so at once), or a group
 * with no project (Trace's facts say so), covers the screen's column with Trace (the setup wire, inside the frame) where
 * the screen would have shown its failed read. A sibling of the screen, not a wrapper. Demo is never gated, and reads
 * nothing. On /trace itself the screen is Trace already, and shows the gate's copy. When Trace's re-check sees the live
 * source come up, the shell reads again, the facts follow and the cover lifts; the screen under it, whose read failed
 * while the source was not ready, reads again (the host's screen quietly; a route the host does not draw, by the router).
 */
export function LiveGate() {
  const { data } = useShellInfo();
  const path = usePathname();
  const router = useRouter();
  const gate = useGateFacts(data);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !gate.cover) {
      hostRevalidate();
      router.refresh();
    }
    was.current = gate.cover;
  }, [gate.cover, router]);
  if (!gate.cover || path === '/trace') return null;
  return (
    <div className={styles.cover}>
      <SliceFixture slices={gate.facts ? { facts: gate.facts } : {}}>
        <TraceScreen facts={gate.facts} onLive={requestShellRead} />
      </SliceFixture>
    </div>
  );
}
