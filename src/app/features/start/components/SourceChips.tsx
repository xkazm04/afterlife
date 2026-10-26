import { Chip } from '@/components/status/chip/Chip';
import type { SourceChips as Source } from '../model/view';
import styles from './step.module.css';

const FROM = { env: 'from the env', setting: 'set here', unset: 'default' } as const;

/** Which GitLab and mode the steps read, and which name set each value: demo is never mistaken for a group, nor the fake for a real one. */
export function SourceChips({ source: s }: { source: Source }) {
  return (
    <div role="group" aria-label="What this server reads" className={styles.chips}>
      {s.fake ? <Chip tone="unknown">seeded fake GitLab, not a real group</Chip> : null}
      <Chip tone={s.mode === 'live' ? 'accent' : 'unknown'} title={FROM[s.sources.mode]}>
        {s.mode} · {FROM[s.sources.mode]}
      </Chip>
      <Chip tone="plain" title={FROM[s.sources.group]}>
        group {s.group} · {FROM[s.sources.group]}
      </Chip>
      <Chip tone="plain" title={FROM[s.sources.host]}>
        {s.host} · {FROM[s.sources.host]}
      </Chip>
    </div>
  );
}
