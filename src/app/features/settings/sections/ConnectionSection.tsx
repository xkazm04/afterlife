import type { ReactNode } from 'react';
import { Unread } from '@/components/shell/host';
import type { ConnectionRead } from '../data/connection';
import { SettingsSection } from '../components/SettingsSection';
import { StatusLine } from './StatusLine';
import styles from './Table.module.css';

/**
 * Mode, GitLab kind, host and group, as the server read its environment (data/connection.ts, the screen's `connection`
 * slice). Before the read lands every value is a dash in the same rows, so nothing moves when it does. Never a token.
 */
export function ConnectionSection({ read }: { read?: ConnectionRead }) {
  const v = (s: string | undefined, what: string): ReactNode => s ?? <Unread label={`${what} not read yet`} />;
  const rows: [string, ReactNode][] = [
    ['Mode', v(read?.mode, 'mode')],
    ['GitLab', v(read?.gitlab, 'GitLab')],
    ['Host', v(read?.host, 'host')],
    ['Group id', v(read?.groupId, 'group id')],
    ['Status bar says', <StatusLine key="s" />],
  ];
  return (
    <SettingsSection id="connection" title="Connection">
      <table className={styles.t} aria-label="Data and connection">
        <tbody>
          {rows.map(([k, val]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td className={k === 'Host' || k === 'Group id' ? styles.mono : undefined}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SettingsSection>
  );
}
