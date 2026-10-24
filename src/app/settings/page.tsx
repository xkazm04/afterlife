import { redirect } from 'next/navigation';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// /settings has no page of its own: the first sub-page is the front of it.
export default function SettingsPage() {
  redirect('/settings/display');
}
