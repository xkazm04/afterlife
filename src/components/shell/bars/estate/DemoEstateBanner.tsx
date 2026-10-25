'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { demoBannerShown } from '@/lib/settings/demoEstate';
import { useShellInfo } from '../../ShellContext';
import { activeNavKey } from '../../sidebar/navItems';
import styles from './DemoEstateBanner.module.css';

/**
 * The one "Demo data - illustrative" strip, under the toolbar of a demo screen (lib/settings/demoEstate DEMO_SCREENS)
 * whenever a real project is saved beside it or the demo estate is off and the screen was reached by URL: a demo
 * number never sits beside a real one unlabelled. Draws nothing anywhere else. Reads the pathname, so Window renders
 * it behind <Suspense>.
 */
export function DemoEstateBanner() {
  const { estate } = useShellInfo();
  const key = activeNavKey(usePathname());
  if (!estate || !demoBannerShown(key, estate)) return null;
  return (
    <div className={styles.banner} role="note" aria-label="Demo data">
      <b>Demo data — illustrative</b>
      <span className={styles.note}>an invented estate, not your projects.</span>
      {estate.real > 0 ? (
        <Link href="/vitals" className={styles.link}>
          Your real projects in Vitals ›
        </Link>
      ) : null}
      <Link href="/settings/data" className={styles.link}>
        Demo estate setting ›
      </Link>
    </div>
  );
}
