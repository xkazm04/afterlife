import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** A quiet raised tile on the content ground (rounded, one hairline). Size and layout are the caller's `className`. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}
