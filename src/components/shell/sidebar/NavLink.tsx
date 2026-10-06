import { Icon } from '@/components/icons/Icon';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { NavEntry } from './navItems';
import { SidebarItem } from './SidebarItem';

/** One entry of the app navigation as a sidebar link, with the Needs-you badge where the entry asks for it. */
export function NavLink({ entry, current, needsYou = 0 }: { entry: NavEntry; current: boolean; needsYou?: number }) {
  return (
    <SidebarItem
      href={entry.href}
      icon={<Icon name={entry.icon} />}
      label={entry.label}
      current={current}
      count={entry.needsYouBadge ? <NeedsYouBadge count={needsYou} small /> : undefined}
    />
  );
}
