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
  const rows: [string, ReactNode][] = [
    ['Mode', live ? 'live (BELAY_MODE=live)' : 'demo (the default)'],
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
