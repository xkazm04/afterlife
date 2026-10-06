import type { ProjectState } from '@/lib/demo/types';
import styles from './status.module.css';

/**
 * A project's state as a 10px glyph: watching = filled green, setting up = half-filled ring, stale = struck amber
 * ring, not watched = dashed ring (unknown is always dashed).
 */
export function StateGlyph({ state }: { state: ProjectState }) {
  let body;
  if (state === 'watching') body = <circle cx="5" cy="5" r="4" fill="var(--ok)" />;
  else if (state === 'setting-up')
    body = (
      <>
        <circle cx="5" cy="5" r="3.9" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
        <path d="M5 1.1a3.9 3.9 0 0 1 0 7.8z" fill="var(--accent)" />
      </>
    );
  else if (state === 'stale')
    body = (
      <>
        <circle cx="5" cy="5" r="3.9" fill="none" stroke="var(--stale)" strokeWidth="1.2" />
        <path d="M2.4 7.6l5.2-5.2" stroke="var(--stale)" strokeWidth="1.2" />
      </>
    );
  else body = <circle cx="5" cy="5" r="3.9" fill="none" stroke="var(--unknown)" strokeWidth="1.1" strokeDasharray="2 1.6" />;
  return (
    <svg className={styles.sg} viewBox="0 0 10 10" aria-hidden="true">
      {body}
    </svg>
  );
}
