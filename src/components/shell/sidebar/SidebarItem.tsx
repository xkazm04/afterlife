import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

/**
 * One source-list row: icon, label, optional right-aligned count (or any node, e.g. a NeedsYouBadge). With `href`
 * it is a link (navigation); otherwise a button (a filter). `current` highlights it.
 */
export function SidebarItem({
  icon,
  label,
  count,
  current,
  href,
  title,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  count?: ReactNode;
  current?: boolean;
  href?: string;
  title?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={styles.ico}>{icon}</span>
      <span className={styles.lb}>{label}</span>
      <span className={styles.ct}>{count}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={styles.si} aria-current={current ? 'page' : undefined} title={title} onClick={onClick}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.si} aria-current={current ? 'true' : undefined} title={title} onClick={onClick}>
      {body}
    </button>
  );
}
