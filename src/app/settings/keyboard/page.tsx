import type { Metadata } from 'next';
import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { KeyboardSection } from '../../features/settings/components/KeyboardSection';
import { ScreenKeysSection } from '../../features/settings/sections/ScreenKeysSection';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Settings Keyboard' };

export default function KeyboardSettings() {
  return (
    <SettingsWindow title="Keyboard" lede="Shortcuts that work everywhere, then the ones each screen adds.">
      <KeyboardSection />
      <ScreenKeysSection />
    </SettingsWindow>
  );
}
