import { KeyValue } from '@/components/inspector/KeyValue';
import { APP_VERSION } from '@/lib/version';
import { BROWSER_KEYS } from '../data/browserKeys';
import { SettingsSection } from './SettingsSection';

/** Version and what this app keeps in the browser. What the data is lives on Data & connection. */
export function AboutSection() {
  return (
    <SettingsSection id="about" title="About">
      <KeyValue
        rows={[
          ['Afterlife', `v${APP_VERSION}`],
          ...BROWSER_KEYS.map(({ what, key }) => [`${what} is stored as`, <code key={key}>{key}</code>] as const),
          ['Stored where', 'localStorage, in this browser only'],
        ]}
      />
    </SettingsSection>
  );
}
