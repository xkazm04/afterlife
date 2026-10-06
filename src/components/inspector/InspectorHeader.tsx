import type { ReactNode } from 'react';
import styles from './InspectorHeader.module.css';

/** The inspector's title block: a name (with an optional leading glyph), a sub line and a mono path. */
export function InspectorHeader({
  title,
  icon,
  sub,
  path,
  children,
}: {
  title: ReactNode;
  icon?: ReactNode;
  sub?: ReactNode;
  path?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.ih}>
      <h2 className={styles.h2}>
        {icon}
        {title}
      </h2>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
      {path ? <div className={styles.path}>{path}</div> : null}
      {children}
    </div>
  );
}
