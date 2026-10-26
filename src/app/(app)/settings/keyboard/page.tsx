import type { Metadata } from 'next';
import { SettingsWindow } from '@/app/features/settings/SettingsWindow';
import { KeyboardSection } from '@/app/features/settings/components/KeyboardSection';
import { ScreenKeysSection } from '@/app/features/settings/sections/ScreenKeysSection';

export const metadata: Metadata = { title: 'Afterlife · Settings · Keyboard' };

export default function KeyboardSettings() {
  return (
    <SettingsWindow title="Keyboard" lede="Shortcuts that work everywhere, then the ones each screen adds.">
      <KeyboardSection />
      <ScreenKeysSection />
    </SettingsWindow>
  );
}
