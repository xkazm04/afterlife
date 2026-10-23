import { Kbd } from '@/components/controls/Kbd';
import { SCREEN_KEYS } from '../data/screenKeys';
import { SettingsSection } from '../components/SettingsSection';
import styles from './Table.module.css';

/**
 * The keys each screen registers, grouped by screen. Plain letters work when no text field has focus. One tbody per
 * screen whose name heads the group (rowgroup, spanning its rows), so no row is announced under an empty header.
 */
export function ScreenKeysSection() {
  return (
    <SettingsSection id="screen-keys" title="Per screen">
      <table className={styles.t} aria-label="Keys by screen">
        {SCREEN_KEYS.map((s) => (
          <tbody key={s.screen}>
            {s.keys.map((k, i) => (
              <tr key={k.does}>
                {i === 0 && (
                  <th scope="rowgroup" rowSpan={s.keys.length}>
                    {s.screen}
                  </th>
                )}
                <td>
                  <span className={styles.keys}>
                    {k.keys.map((c) => (
                      <Kbd key={c}>{c}</Kbd>
                    ))}
                  </span>
                </td>
                <td>{k.does}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </SettingsSection>
  );
}
