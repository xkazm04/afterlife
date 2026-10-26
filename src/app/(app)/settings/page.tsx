import { ToSettingsFront } from '@/app/features/settings/screen/ToFront';

// /settings has no page of its own: the first sub-page is the front of it. Static: the replace is a client constant
// (features/settings/screen/ToFront.tsx), so a hard load prerenders and nothing waits for a request.
export default function SettingsPage() {
  return <ToSettingsFront />;
}
