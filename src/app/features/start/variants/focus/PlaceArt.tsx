import type { Place } from '../../model/view';
import styles from './focus.module.css';

/** A large, simple picture of where the step lives: this machine (a laptop), GitLab (a group of projects), Afterlife (a beacon). */
export function PlaceArt({ place }: { place: Place }) {
  return (
    <svg className={styles.art} viewBox="0 0 120 80" aria-hidden="true" data-place={place}>
      {place === 'this machine' ? (
        <>
          <rect x="24" y="12" width="72" height="46" rx="4" />
          <path d="M14 66h92l-6-8H20z" />
          <path className={styles.artLine} d="M34 26h20M34 34h34M34 42h14" />
        </>
      ) : place === 'GitLab' ? (
        <>
          <circle cx="60" cy="40" r="10" />
          <circle cx="26" cy="22" r="7" />
          <circle cx="94" cy="22" r="7" />
          <circle cx="30" cy="62" r="7" />
          <circle cx="90" cy="62" r="7" />
          <path className={styles.artLine} d="M51 35 32 25M69 35l19-10M52 46 36 58M68 46l16 12" />
        </>
      ) : (
        <>
          <circle cx="60" cy="40" r="8" />
          <circle className={styles.artLine} cx="60" cy="40" r="20" />
          <circle className={styles.artFaint} cx="60" cy="40" r="32" />
        </>
      )}
    </svg>
  );
}
