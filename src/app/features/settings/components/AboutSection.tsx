import { KeyValue } from '@/components/inspector/KeyValue';
import { APP_VERSION } from '@/lib/version';
import { TEXT_SIZE_STORAGE_KEY } from '@/lib/settings/textSize';
import { SettingsSection } from './SettingsSection';

/** Version and the one thing this app keeps in the browser. What the data is lives on Data & connection. */
export function AboutSection() {
  return (
    <SettingsSection id="about" title="About">
      <KeyValue
        rows={[
          ['Belay', `v${APP_VERSION}`],
          ['Text size is stored as', <code key="k">{TEXT_SIZE_STORAGE_KEY}</code>],
          ['Stored where', 'localStorage, in this browser only'],
        ]}
      />
    </SettingsSection>
  );
}
