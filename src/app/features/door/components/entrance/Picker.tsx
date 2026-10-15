import { ENTRANCES } from './variants';
import type { EntranceId } from './types';
import styles from './picker.module.css';

/**
 * The prototypes side by side until one wins: each link reloads the page (a full load, so the door is the first paint),
 * the current one replays. Removed once a winner is picked.
 */
export function EntrancePicker({ current }: { current: EntranceId }) {
  return (
    <nav className={styles.picker} aria-label="Entrance prototypes">
      <span className={styles.label}>Entrance</span>
      {(Object.keys(ENTRANCES) as EntranceId[]).map((id) => (
        <a key={id} href={`/?entrance=${id}`} className={styles.opt} aria-current={id === current ? 'true' : undefined}>
          <b>{id.toUpperCase()}</b> {ENTRANCES[id].name}
        </a>
      ))}
      <a href={`/?entrance=${current}`} className={styles.replay}>
        ↻ Replay
      </a>
    </nav>
  );
}
