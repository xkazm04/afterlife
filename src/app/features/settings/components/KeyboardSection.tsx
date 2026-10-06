import { Kbd } from '@/components/controls/Kbd';
import { SHORTCUTS } from '../data/shortcuts';
import { SettingsSection } from './SettingsSection';
import styles from './KeyboardSection.module.css';

/** The text-size shortcuts (Cmd on a Mac, Ctrl on Windows) and the inspector toggle. */
export function KeyboardSection() {
  return (
    <SettingsSection id="keyboard" title="Keyboard">
      <ul className={styles.list}>
        {SHORTCUTS.map((s) => (
          <li key={s.label} className={styles.row}>
            <span>{s.label}</span>
            <span className={styles.keys}>
              <span className={styles.combo}>
                {s.mac.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
              <span className={styles.or}>or</span>
              <span className={styles.combo}>
                {s.other.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
