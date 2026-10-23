import type { Metadata } from 'next';
import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { ConnectionSection } from '../../features/settings/sections/ConnectionSection';

export const metadata: Metadata = { title: 'Belay Settings Data & connection' };

export default function DataSettings() {
  return (
    <SettingsWindow title="Data & connection" lede="Where the numbers come from. Read from the server's environment; no tokens are shown.">
      <ConnectionSection />
    </SettingsWindow>
  );
}
