import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { KeyboardSection } from '../../features/settings/components/KeyboardSection';
import { ScreenKeysSection } from '../../features/settings/sections/ScreenKeysSection';

export default function KeyboardSettings() {
  return (
    <SettingsWindow title="Keyboard" lede="Shortcuts that work everywhere, then the ones each screen adds.">
      <KeyboardSection />
      <ScreenKeysSection />
    </SettingsWindow>
  );
}
