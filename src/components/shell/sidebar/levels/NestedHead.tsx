'use client';

import { Suspense, type RefObject } from 'react';
import { useHerePath } from '@/components/shell/host';
import { Icon } from '@/components/icons/Icon';
import { navEntryFor } from '../navItems';
import styles from './levels.module.css';

/**
 * The second level's head: the way back to the app menu, then the screen whose sections fill this level, as a title. The
 * pathname read waits behind <Suspense> (see AppNav); until then there is no title, the way back is there.
 */
export function NestedHead({ onBack, backRef }: { onBack: () => void; backRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <div className={styles.head}>
      <button ref={backRef} type="button" className={styles.back} onClick={onBack} aria-label="Back to the menu">
        <span className={styles.chev} aria-hidden="true">
          ‹
        </span>
        Menu
      </button>
      <Suspense fallback={null}>
        <Title />
      </Suspense>
    </div>
  );
}

function Title() {
  const entry = navEntryFor(useHerePath());
  return (
    <div key={entry?.key ?? ''} className={styles.title}>
      {entry ? (
        <>
          <span className={styles.ico}>
            <Icon name={entry.icon} />
          </span>
          {entry.label}
        </>
      ) : null}
    </div>
  );
}
