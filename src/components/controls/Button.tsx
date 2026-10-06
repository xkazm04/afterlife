import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'default' | 'primary' | 'accent' | 'ghost' | 'danger';

interface Look {
  variant?: ButtonVariant;
  size?: 'md' | 'mini';
}
type AsButton = ButtonHTMLAttributes<HTMLButtonElement> & Look & { href?: undefined };
type AsLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & Look & { href: string };

/**
 * The push button. `primary` is the amber "your decision" button (use sparingly), `accent` is cyan, `ghost` is an
 * outline, `danger` is the red revoke look. `size="mini"` is the 18px row button used inside tables.
 * With `href` it is a link (client navigation) that looks the same: a button that goes somewhere.
 */
export function Button(props: AsButton | AsLink) {
  const { variant = 'default', size = 'md', className, ...rest } = props;
  const cls = [styles.btn, styles[variant], size === 'mini' ? styles.mini : '', props.href !== undefined ? styles.link : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  if (rest.href !== undefined) return <Link {...(rest as Omit<AsLink, keyof Look>)} className={cls} />;
  const { type = 'button', ...btn } = rest as Omit<AsButton, keyof Look>;
  return <button type={type} className={cls} {...btn} />;
}
