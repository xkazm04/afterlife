'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { Unread } from '@/components/shell/host';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import type { FleetProject } from '@/lib/demo/types';
import { ChangeMark } from '../table/cells/ChangeMark';
import { sourceLabel } from '../../model/list/filtering';
import { SMART_FILTERS } from '../../model/list/smartFilters';
import type { SmartId, Source } from '../../model/types';
import styles from './sidebar.module.css';

const folder = (
  <span className={styles.folder}>
    <Icon name="folder" />
  </span>
);

const changeIcon = <ChangeMark />;
const seenIcon = (
  <span className={styles.folder}>
    <Icon name="check" />
  </span>
);

const SMART_ICONS: Record<SmartId, ReactNode> = {
  needs: (
    <span className={styles.needs}>
      <Icon name="diamond" />
    </span>
  ),
  stale: <StateGlyph state="stale" />,
  setup: <StateGlyph state="setting-up" />,
  unwatched: <StateGlyph state="not-set-up" />,
  quar: <TierMark tier="quarantined" />,
  handsoff: <TierMark tier="hands_off" />,
};

/**
 * The source list: all projects, what changed since the last look (with Mark seen once something did), one entry per
 * group, and the six smart filters, each with its count. `unread`: the fleet is not read yet, every count is a dash and
 * the groups are not known (a bookmarked group source keeps its row, a dash beside it).
 */
export function FleetSidebar({
  projects,
  groups,
  source,
  onSource,
  changed,
  onMarkSeen,
  unread = false,
}: {
  projects: readonly FleetProject[];
  groups: readonly string[];
  source: Source;
  onSource: (s: Source) => void;
  changed: number;
  onMarkSeen: () => void;
  unread?: boolean;
}) {
  const n = (count: number) => (unread ? <Unread /> : count);
  const shown = unread && source.startsWith('g:') ? [source.slice(2)] : groups;
  return (
    <>
      <SidebarSection title="Fleet">
        <SidebarItem icon={folder} label={sourceLabel('all')} count={n(projects.length)} current={source === 'all'} onClick={() => onSource('all')} />
        <SidebarItem icon={changeIcon} label={sourceLabel('changed')} count={n(changed)} current={source === 'changed'} onClick={() => onSource('changed')} />
        {changed && !unread ? <SidebarItem icon={seenIcon} label="Mark seen" title="Take this look as the one the marks compare with" onClick={onMarkSeen} /> : null}
      </SidebarSection>
      <SidebarSection title="Groups">
        {shown.map((g) => (
          <SidebarItem key={g} icon={folder} label={sourceLabel(`g:${g}`)} count={n(projects.filter((p) => p.group === g).length)} current={source === `g:${g}`} onClick={() => onSource(`g:${g}`)} />
        ))}
      </SidebarSection>
      <SidebarSection title="Smart filters">
        {SMART_FILTERS.map((s) => (
          <SidebarItem key={s.id} icon={SMART_ICONS[s.id]} label={s.label} count={n(projects.filter(s.test).length)} current={source === s.id} onClick={() => onSource(s.id)} />
        ))}
      </SidebarSection>
    </>
  );
}
