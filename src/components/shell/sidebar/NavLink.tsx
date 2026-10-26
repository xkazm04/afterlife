import { Icon } from '@/components/icons/Icon';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import type { NavEntry } from './navItems';
import { SidebarItem } from './SidebarItem';

/**
 * One entry of the app navigation as a sidebar link, with the Needs-you badge where the entry asks for it. `onOpen`: the
 * entry is the screen in front and has a second level; a chevron says so (beside the badge), and the click opens it.
 */
export function NavLink({ entry, current, needsYou = 0, onOpen }: { entry: NavEntry; current: boolean; needsYou?: number; onOpen?: (() => void) | undefined }) {
  const badge = entry.needsYouBadge ? <NeedsYouBadge count={needsYou} small /> : null;
  return (
    <SidebarItem
      href={entry.href}
      icon={<Icon name={entry.icon} />}
      label={entry.label}
      current={current}
      count={
        onOpen ? (
          <>
            {badge}
            <span aria-hidden="true">›</span>
          </>
        ) : (
          (badge ?? undefined)
        )
      }
      title={onOpen ? `${entry.label}: show its own sections` : undefined}
      onClick={onOpen}
    />
  );
}
