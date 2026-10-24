import type { Metadata } from 'next';
import { SettingsWindow } from '../../features/settings/SettingsWindow';
import { TextSizeSection } from '../../features/settings/components/TextSizeSection';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Settings Display' };

export default function DisplaySettings() {
  return (
    <SettingsWindow title="Display" lede="How large the text and controls are in this browser.">
      <TextSizeSection />
    </SettingsWindow>
  );
}
