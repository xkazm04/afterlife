import type { ReactNode } from 'react';
import styles from './SettingsSection.module.css';

/** One block of a Settings sub-page: a heading and a card. Add a setting by adding a section to its page (src/app/settings/<page>/page.tsx). */
export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} className={styles.section} aria-labelledby={`settings-${id}-h`}>
      <h2 id={`settings-${id}-h`} className={styles.h}>
        {title}
      </h2>
      <div className={styles.card}>{children}</div>
    </section>
  );
}
