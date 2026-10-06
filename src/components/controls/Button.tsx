import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'default' | 'primary' | 'accent' | 'ghost' | 'danger';

/**
 * The push button. `primary` is the amber "your decision" button (use sparingly), `accent` is cyan, `ghost` is an
 * outline, `danger` is the red revoke look. `size="mini"` is the 18px row button used inside tables.
 */
export function Button({
  variant = 'default',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'md' | 'mini' }) {
  const cls = [styles.btn, styles[variant], size === 'mini' ? styles.mini : '', className ?? ''].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
