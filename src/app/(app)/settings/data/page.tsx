import type { Metadata } from 'next';
import { SettingsWindow } from '@/app/features/settings/SettingsWindow';
import { ConnectionSection } from '@/app/features/settings/sections/ConnectionSection';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Settings Data & connection' };

// ConnectionSection reads the server's environment: at request time, never the build's.
export default async function DataSettings() {
  await connection();
  return (
    <SettingsWindow title="Data & connection" lede="Where the numbers come from. Read from the server's environment; no tokens are shown.">
      <ConnectionSection />
    </SettingsWindow>
  );
}
