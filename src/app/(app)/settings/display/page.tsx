import type { Metadata } from 'next';
import { SettingsWindow } from '@/app/features/settings/SettingsWindow';
import { TextSizeSection } from '@/app/features/settings/components/TextSizeSection';

export const metadata: Metadata = { title: 'Belay Settings Display' };

export default function DisplaySettings() {
  return (
    <SettingsWindow title="Display" lede="How large the text and controls are in this browser.">
      <TextSizeSection />
    </SettingsWindow>
  );
}
