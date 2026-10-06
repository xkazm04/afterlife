import type { ButtonHTMLAttributes } from 'react';
import styles from './ToolbarButton.module.css';

/** The borderless toolbar button. `pressed` makes it a toggle (cyan when on). Icon-only buttons need `aria-label`. */
export function ToolbarButton({
  pressed,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={[styles.tbtn, className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
