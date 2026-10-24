import { connection } from 'next/server';
import { liveGate, loadTraceFacts } from './data/facts';
import { TraceScreen } from './TraceScreen';
import styles from './components/trace.module.css';

/**
 * The (app) layout's gate, read per request: live mode before the first poll, or a group with no project, covers the
 * screen's column with Trace (the setup wire, inside the frame) where the screen would have shown the error page. A
 * sibling of the screen, not a wrapper: the screens hydrate exactly as they did. Demo is never gated.
 */
export async function LiveGate() {
  await connection(); // request time: the mode and the runtime are the running server's, never the build's
  if (liveGate().gate === null) return null;
  return (
    <div className={styles.cover}>
      <TraceScreen facts={loadTraceFacts(false)} />
    </div>
  );
}
