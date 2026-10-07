'use client';

import styles from './Fallback.module.css';

/**
 * What error.tsx and global-error.tsx both show: the page could not be read, the error's message and digest, a Retry.
 * It depends on no provider and shows no data, so it renders when the layout's own read is what failed.
 */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.card} role="alert">
        <h1 className={styles.title}>This page could not be read</h1>
        <dl className={styles.detail}>
          <dt>message</dt>
          <dd>{error.message}</dd>
          <dt>digest</dt>
          <dd>{error.digest ?? 'none'}</dd>
        </dl>
        <p className={styles.note}>
          In live mode, the server log line starting &quot;belay:&quot; names the failed read. Nothing here is demo data.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => retry()}>
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}
