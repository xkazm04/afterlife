import type { Metadata } from 'next';
import { SettingsWindow } from '@/app/features/settings/SettingsWindow';
import { AboutSection } from '@/app/features/settings/components/AboutSection';

export const metadata: Metadata = { title: 'Belay Settings About' };

export default function AboutSettings() {
  return (
    <SettingsWindow title="About" lede="Which build this is, and what it keeps in your browser.">
      <AboutSection />
    </SettingsWindow>
  );
}
