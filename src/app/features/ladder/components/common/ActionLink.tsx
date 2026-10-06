import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './ActionLink.module.css';

// kit-candidate: Button as a link. The amber "your decision" look of Button variant="primary", for navigation.
export function ActionLink({
  href,
  size = 'md',
  title,
  tabIndex,
  children,
}: {
  href: string;
  size?: 'md' | 'mini';
  title?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${styles.link} ${size === 'mini' ? styles.mini : ''}`} title={title} tabIndex={tabIndex}>
      {children}
    </Link>
  );
}
