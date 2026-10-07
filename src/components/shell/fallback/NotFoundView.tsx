'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Fallback.module.css';

/** not-found.tsx's view: names the path that was not found and links back to Fleet. */
export function NotFoundView() {
  const path = usePathname();
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Not found</h1>
        <p className={styles.note}>
          There is no page at <code>{path}</code>.
        </p>
        <div className={styles.actions}>
          <Link href="/fleet" className={styles.link}>
            Go to Fleet
          </Link>
        </div>
      </div>
    </main>
  );
}
