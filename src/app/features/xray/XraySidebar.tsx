'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { activeNavKey } from '@/components/shell/sidebar/navItems';
import { TOUR } from './callouts/tour';
import { useXray, xrayStore } from './model/store';

/**
 * The sidebar's first-run mode: until the five labelled screens have been seen, a "First run" section lists them with a
 * check for each one seen (each link opens that screen with the X-ray on), the X-ray switch and the way to your own
 * project. Once all five are seen it folds to the switch and that way alone.
 */
export function XraySidebar() {
  const x = useXray();
  const here = activeNavKey(usePathname());
  const done = TOUR.filter((s) => x.seen.includes(s.key)).length;
  const firstRun = done < TOUR.length;
  return (
    <SidebarSection title={firstRun ? 'First run' : 'Help'} aux={firstRun ? `${done} / ${TOUR.length} seen` : undefined}>
      {firstRun
        ? TOUR.map((s) => (
            <SidebarItem
              key={s.key}
              icon={x.seen.includes(s.key) ? <Icon name="check" label="seen" /> : <Icon name="disc" />}
              label={`X-ray ${s.label}`}
              current={x.on && here === s.key}
              href={`${s.href}?xray=1`}
              title={`Open ${s.label} with every part labelled`}
            />
          ))
        : null}
      <SidebarItem icon={<Icon name="search" />} label={x.on ? 'Hide the X-ray' : 'X-ray this screen'} count="X" onClick={() => xrayStore.toggle()} />
      <SidebarItem icon={<Icon name="probe" />} label="Set up my first project" href="/trace" current={here === 'trace'} />
    </SidebarSection>
  );
}
