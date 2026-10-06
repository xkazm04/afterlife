import type { ReactNode } from 'react';
import { Button } from '@/components/controls/Button';
import type { ActionId, Action } from '../../model/types';
import styles from './inspector.module.css';

/** The inspector's button bar under the header. */
export function Acts({ children }: { children: ReactNode }) {
  return <div className={styles.acts}>{children}</div>;
}

/** A button that dispatches one ActionId. */
export function ActBtn({ dispatch, action, variant, disabled, title, children }: { dispatch: (a: Action) => void; action: ActionId; variant?: 'default' | 'primary' | 'accent' | 'ghost' | 'danger'; disabled?: boolean; title?: string; children: ReactNode }) {
  return (
    <Button variant={variant} disabled={disabled} title={title} onClick={() => dispatch({ type: 'act', action })}>
      {children}
    </Button>
  );
}
