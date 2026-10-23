import type { ReactNode } from 'react';
import { readDataConfig } from '@/server/data/config';
import { readConfig } from '@/server/gitlab/config';
import { SettingsSection } from '../components/SettingsSection';
import { StatusLine } from './StatusLine';
import styles from './Table.module.css';

/** Mode, GitLab kind, host and group, read from the server's environment. Never a token: none is read anywhere. */
export function ConnectionSection() {
  const data = readDataConfig(process.env);
  const gl = readConfig(process.env);
  const live = data.mode === 'live';
  const fake = live && data.gitlab === 'fake';
  // Any value but `live` serves the demo (the hosted replay sets `replay`); only an unset variable is "the default".
  const set = process.env.BELAY_MODE;
  const mode = live ? 'live (BELAY_MODE=live)' : set ? `demo (BELAY_MODE=${set} is not live)` : 'demo (the default)';
  const rows: [string, ReactNode][] = [
    ['Mode', mode],
    ['GitLab', !live ? 'not used in demo' : fake ? 'seeded fake, not a real group' : 'real, through the glab login'],
    ['Host', !live || fake ? 'none' : (gl.host ?? 'gitlab.com')],
    ['Group id', !live || fake ? 'none' : gl.groupId],
    ['Status bar says', <StatusLine key="s" />],
  ];
  return (
    <SettingsSection id="connection" title="Connection">
      <table className={styles.t} aria-label="Data and connection">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td className={k === 'Host' || k === 'Group id' ? styles.mono : undefined}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SettingsSection>
  );
}
