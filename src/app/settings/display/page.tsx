import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { TextSizeSection } from '../../features/settings/components/TextSizeSection';

export default function DisplaySettings() {
  return (
    <SettingsWindow title="Display" lede="How large the text and controls are in this browser.">
      <TextSizeSection />
    </SettingsWindow>
  );
}
