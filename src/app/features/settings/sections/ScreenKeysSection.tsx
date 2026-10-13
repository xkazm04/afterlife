import { Kbd } from '@/components/controls/Kbd';
import { SCREEN_KEYS } from '../data/screenKeys';
import { SettingsSection } from '../components/SettingsSection';
import styles from './Table.module.css';

/** The keys each screen registers, grouped by screen. Plain letters work when no text field has focus. */
export function ScreenKeysSection() {
  return (
    <SettingsSection id="screen-keys" title="Per screen">
      <table className={styles.t} aria-label="Keys by screen">
        <tbody>
          {SCREEN_KEYS.flatMap((s) =>
            s.keys.map((k, i) => (
              <tr key={`${s.screen}-${k.does}`}>
                <th scope="row">{i === 0 ? s.screen : ''}</th>
                <td>
                  <span className={styles.keys}>
                    {k.keys.map((c) => (
                      <Kbd key={c}>{c}</Kbd>
                    ))}
                  </span>
                </td>
                <td>{k.does}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </SettingsSection>
  );
}
