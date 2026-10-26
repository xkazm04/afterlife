import { Unread } from '@/components/shell/host';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { GroupProgress } from '../model/funnel';

/** The estate's groups with how many of their projects are watched; picking one scopes the batch to it. */
/** `total` absent: the estate is not read yet (a dash). */
export function OnboardSidebar({ groups, total, group, onGroup }: { groups: readonly GroupProgress[]; total?: number; group: string | null; onGroup: (g: string | null) => void }) {
  return (
    <SidebarSection title="Scope">
      <SidebarItem label="Whole estate" count={total ?? <Unread />} current={group == null} onClick={() => onGroup(null)} />
      {groups.map((g) => (
        <SidebarItem
          key={g.group}
          label={g.group}
          count={`${g.at.watching + g.at.cycling}/${g.total}`}
          current={group === g.group}
          title={`${g.group}: ${g.at.watching + g.at.cycling} of ${g.total} watched`}
          onClick={() => onGroup(group === g.group ? null : g.group)}
        />
      ))}
    </SidebarSection>
  );
}
