import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/glyphs';
import styles from './ToolbarButton.module.css';

/**
 * A toolbar pill that opens a menu: optional icon, label, chevron. `active` tints it cyan (a filter is applied).
 * Open the menu with useMenu().openFrom(buttonElement, ...) from onClick.
 */
export function PopupButton({
  icon,
  children,
  active,
  ref,
  type = 'button',
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon?: IconName;
  children: ReactNode;
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const cls = [styles.tbtn, styles.pu, active ? styles.on : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} aria-haspopup="menu" className={cls} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
      <Icon name="chevDown" className={styles.chev} />
    </button>
  );
}
