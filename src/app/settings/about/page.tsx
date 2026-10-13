import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { AboutSection } from '../../features/settings/components/AboutSection';

export default function AboutSettings() {
  return (
    <SettingsWindow title="About" lede="Which build this is, and what it keeps in your browser.">
      <AboutSection />
    </SettingsWindow>
  );
}
