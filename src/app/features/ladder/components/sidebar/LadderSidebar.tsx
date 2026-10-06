'use client';

import { Icon } from '@/components/icons/Icon';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { ALL_SOURCE, SMART_FILTERS, matchesSource } from '../../model/view/filters';
import type { ClassRow, TrackMap } from '../../model/types';
import { SMART_ICONS } from './smartIcons';
import styles from './sidebar.module.css';

/** The sidebar: Tracks (all classes, T1-T8) and the five smart filters, each with its count. One is current. */
export function LadderSidebar({
  classes,
  tracks,
  trackIds,
  src,
  onSource,
}: {
  classes: readonly ClassRow[];
  tracks: TrackMap;
  trackIds: readonly string[];
  src: string;
  onSource: (src: string) => void;
}) {
  const count = (s: string) => classes.filter((c) => matchesSource(c, s, tracks)).length;
  return (
    <>
      <SidebarSection title="Tracks">
        <SidebarItem
          icon={<span className={styles.all}><Icon name="ladder" /></span>}
          label="All classes"
          count={classes.length}
          current={src === ALL_SOURCE}
          onClick={() => onSource(ALL_SOURCE)}
        />
        {trackIds.map((id) => (
          <SidebarItem
            key={id}
            icon={<span className={styles.tid}>{id}</span>}
            label={tracks[id]?.key ?? id}
            title={tracks[id]?.name}
            count={count(id)}
            current={src === id}
            onClick={() => onSource(id)}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Smart filters">
        {SMART_FILTERS.map((s) => (
          <SidebarItem key={s.id} icon={SMART_ICONS[s.id]} label={s.label} count={count(s.id)} current={src === s.id} onClick={() => onSource(s.id)} />
        ))}
      </SidebarSection>
    </>
  );
}
