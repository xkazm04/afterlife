import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

// kit-candidate: Card. The prototype's `.card` (a quiet raised tile on the content ground).
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}
