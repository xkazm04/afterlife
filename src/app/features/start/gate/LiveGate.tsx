import { headers } from 'next/headers';
import { connection } from 'next/server';
import { StartScreen } from '../StartScreen';
import { liveGate, loadTraceFacts } from './facts';
import { loadRepos } from './repos';
import styles from './gate.module.css';

/**
 * The (app) layout's gate, read per request: live mode before the first poll, or a group with no project, covers the
 * screen's column with /start (the setup wizard, inside the frame, in Focus) where the screen would have shown the error
 * page. A sibling of the screen, not a wrapper: the screens hydrate exactly as they did. Demo is never gated.
 */
export async function LiveGate() {
  await connection(); // request time: the mode and the runtime are the running server's, never the build's
  if (liveGate().gate === null) return null;
  return (
    <div className={styles.cover}>
      <StartScreen facts={loadTraceFacts(false)} {...await loadRepos(await headers())} switchable={false} />
    </div>
  );
}
