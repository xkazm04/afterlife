'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { activeNavKey } from '@/components/shell/sidebar/navItems';
import { TOUR } from './callouts/tour';
import { useXray, xrayStore } from './model/store';

/**
 * The sidebar's first-run mode: until every labelled screen has been seen, a "First run" section counts them, with the
 * X-ray switch and the way to your own project. The screens themselves are listed in the X-ray's own panel (with Next);
 * listing all twelve here pushed each screen's own sidebar sections (Task's docket, Theater's takes) below the fold.
 */
export function XraySidebar() {
  const x = useXray();
  const here = activeNavKey(usePathname());
  const done = TOUR.filter((s) => x.seen.includes(s.key)).length;
  const firstRun = done < TOUR.length;
  return (
    <SidebarSection title={firstRun ? 'First run' : 'Help'} aux={firstRun ? `${done} / ${TOUR.length} seen` : undefined}>
      <SidebarItem icon={<Icon name="search" />} label={x.on ? 'Hide the X-ray' : 'X-ray this screen'} count="X" onClick={() => xrayStore.toggle()} />
      <SidebarItem icon={<Icon name="probe" />} label="Set up my first project" href="/start" current={here === 'start'} />
    </SidebarSection>
  );
}
