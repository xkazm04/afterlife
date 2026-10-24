import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ShellLoading } from '@/components/shell/loading/ShellLoading';

// /settings has no page of its own: the first sub-page is the front of it. The redirect waits for a request inside
// <Suspense>, so a navigation here paints the Settings window at once and the prerender never meets a thrown redirect.
export default function SettingsPage() {
  return (
    <Suspense fallback={<ShellLoading />}>
      <ToFirstPage />
    </Suspense>
  );
}

async function ToFirstPage(): Promise<never> {
  await connection();
  redirect('/settings/display');
}
