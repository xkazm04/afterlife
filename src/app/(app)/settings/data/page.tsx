import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsSection } from '@/app/features/settings/components/SettingsSection';
import { SettingsWindow } from '@/app/features/settings/SettingsWindow';
import { ConnectionSection } from '@/app/features/settings/sections/ConnectionSection';
import { DemoEstateSection } from '@/app/features/settings/sections/DemoEstateSection';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Belay Settings Data & connection' };

// The window, heading and lede paint at once; the Connection card streams in. The demo-estate switch reads the shell.
export default function DataSettings() {
  return (
    <SettingsWindow title="Data & connection" lede="Where the numbers come from. Read from the server's environment; no tokens are shown.">
      <Suspense fallback={<ConnectionPending />}>
        <Connection />
      </Suspense>
      <DemoEstateSection />
    </SettingsWindow>
  );
}

// ConnectionSection reads the server's environment: at request time, never the build's.
async function Connection() {
  await connection();
  return <ConnectionSection />;
}

function ConnectionPending() {
  return (
    <SettingsSection id="connection" title="Connection">
      <p role="status" aria-busy="true">
        Reading the server&apos;s environment…
      </p>
    </SettingsSection>
  );
}
