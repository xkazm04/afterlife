import { redirect } from 'next/navigation';

// /settings has no page of its own: the first sub-page is the front of it.
export default function SettingsPage() {
  redirect('/settings/display');
}
