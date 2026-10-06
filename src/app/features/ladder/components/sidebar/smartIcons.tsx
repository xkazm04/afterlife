import type { ReactNode } from 'react';
import { TierMark } from '@/components/status/TierMark';
import styles from './sidebar.module.css';

const svg = (stroke: string, children: ReactNode) => (
  <svg className={styles.icon} viewBox="0 0 13 13" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Sidebar icons of the five smart filters (the prototype's drawings). */
export const SMART_ICONS: Readonly<Record<string, ReactNode>> = {
  promote: svg('var(--needs-you)', <path d="M6.5 11V2M2.5 6l4-4 4 4" />),
  below: svg('currentColor', <><path d="M2 2.5h9" strokeDasharray="2 1.5" /><rect x="4" y="7" width="5" height="4" rx="1" /></>),
  leased: svg('currentColor', <><circle cx="6.5" cy="6.5" r="5" /><path d="M6.5 3.5v3l2 1.5" /></>),
  quar: <TierMark tier="quarantined" />,
  pending: svg('var(--accent)', <><circle cx="6.5" cy="6.5" r="2.2" /><path d="M0 6.5h4.3M8.7 6.5H13" /></>),
};
