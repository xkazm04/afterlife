import { KeyValue } from '@/components/inspector/KeyValue';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { APP_VERSION } from '@/lib/version';
import { TEXT_SIZE_STORAGE_KEY } from '@/lib/settings/textSize';
import { SettingsSection } from './SettingsSection';

/** Version and what the data is. */
export function AboutSection() {
  return (
    <SettingsSection id="about" title="About">
      <KeyValue
        rows={[
          ['Belay', `v${APP_VERSION}`],
          ['Data', <HonestyChip key="d" kind="simulated">illustrative demo data</HonestyChip>],
          ['Saved settings', <code key="k">{TEXT_SIZE_STORAGE_KEY}</code>],
        ]}
      />
    </SettingsSection>
  );
}
