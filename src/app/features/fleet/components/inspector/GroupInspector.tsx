'use client';

import { Icon } from '@/components/icons/Icon';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { TierMark } from '@/components/status/TierMark';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { FleetProject, ProjectState } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { plural } from '@/lib/format/plural';
import type { SectionProps } from '../../hooks/useSectionOpen';
import { needsSum, tierTotal } from '../../model/groups';
import styles from './sections/sections.module.css';

const STATES: readonly ProjectState[] = ['watching', 'setting-up', 'stale', 'not-set-up'];

/** Layer 2 for a group: its projects by tier and by state. Counts the whole group, not just what the filters show. */
export function GroupInspector({ group, list, section }: { group: string; list: readonly FleetProject[]; section: (key: string, defaultOpen?: boolean) => SectionProps }) {
  const stateRows = [...STATES.map((s) => [STATE_LABEL[s], list.filter((p) => p.state === s).length] as const), ['Needs you', needsSum(list)] as const];
  return (
    <>
      <InspectorHeader
        icon={
          <span className={styles.folder}>
            <Icon name="folder" />
          </span>
        }
        title={group}
        sub={plural(list.length, 'project')}
      />
      <InspectorSection title="Classes by tier" {...section('g-tiers')}>
        {TIER_DISPLAY_ORDER.map((t) => (
          <div key={t} className={styles.cl}>
            <span className={styles.id}>{TIER_META[t].name}</span>
            <span className={styles.rec} />
            <TierMark tier={t} />
            <span className={styles.tn}>{tierTotal(list, t)}</span>
          </div>
        ))}
      </InspectorSection>
      <InspectorSection title="State" {...section('g-state')}>
        <KeyValue rows={stateRows} />
      </InspectorSection>
    </>
  );
}
