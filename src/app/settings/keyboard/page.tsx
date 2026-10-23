import type { Metadata } from 'next';
import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { KeyboardSection } from '../../features/settings/components/KeyboardSection';
import { ScreenKeysSection } from '../../features/settings/sections/ScreenKeysSection';

export const metadata: Metadata = { title: 'Belay Settings Keyboard' };

export default function KeyboardSettings() {
  return (
    <SettingsWindow title="Keyboard" lede="Shortcuts that work everywhere, then the ones each screen adds.">
      <KeyboardSection />
      <ScreenKeysSection />
    </SettingsWindow>
  );
}
