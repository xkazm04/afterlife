'use client';

import { useHerePath } from '@/components/shell/host';
import { Icon } from '@/components/icons/Icon';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { activeNavKey } from '@/components/shell/sidebar/navItems';
import { useXray, xrayStore } from '@/app/features/xray/model/store';
import { useDemo } from './hooks/useDemo';
import { guideStore, useGuide } from './model/store';

/**
 * The sidebar's first-run section: until the guide has been watched to its recap it is "First run", then "Help". It holds
 * the guide (on the demo estate, where it plays), the X-ray of the screen in front, and the way to your own project.
 */
export function GuideSidebar() {
  const g = useGuide();
  const x = useXray();
  const here = activeNavKey(useHerePath());
  const demo = useDemo();
  return (
    <SidebarSection title={g.done ? 'Help' : 'First run'} aux={!g.done && demo ? 'new' : undefined}>
      {demo ? (
        <SidebarItem
          icon={<Icon name="play" />}
          label={g.on ? 'Leave the guide' : 'Watch the guide'}
          count="G"
          onClick={() => (g.on ? guideStore.close() : guideStore.open())}
        />
      ) : null}
      <SidebarItem icon={<Icon name="search" />} label={x.on ? 'Hide the X-ray' : 'X-ray this screen'} count="X" onClick={() => xrayStore.toggle()} />
      <SidebarItem icon={<Icon name="probe" />} label="Set up my first project" href="/start" current={here === 'start'} />
    </SidebarSection>
  );
}
