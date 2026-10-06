'use client';

import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { MARKS } from '../model/totals';
import type { Lead, MarkKind, Totals } from '../model/types';
import { MarkGlyph } from './MarkGlyph';

const MARK_COUNT: Record<MarkKind, (t: Totals) => number> = {
  needs: (t) => t.needs,
  stale: (t) => t.stale,
  quar: (t) => t.quar,
  setup: (t) => t.setup,
  unwatched: (t) => t.unwatched,
  watching: (t) => t.watching,
};

/** The source list: the six signals (each lights its beats on every lead) and the seven leads (each opens). */
export function MonitorSidebar({
  totals,
  leads,
  mark,
  openLead,
  onMark,
  onLead,
}: {
  totals: Totals;
  leads: readonly Lead[];
  mark: MarkKind | null;
  openLead: string | null;
  onMark: (k: MarkKind) => void;
  onLead: (group: string) => void;
}) {
  return (
    <>
      <SidebarSection title="Signals">
        {MARKS.map((m) => (
          <SidebarItem
            key={m.kind}
            icon={<MarkGlyph kind={m.kind} icon />}
            label={m.label}
            count={MARK_COUNT[m.kind](totals)}
            current={mark === m.kind}
            title={mark === m.kind ? 'Clear' : `Light every ${m.label.toLowerCase()} beat`}
            onClick={() => onMark(m.kind)}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Leads">
        {leads.map((l) => (
          <SidebarItem key={l.group} label={l.group} count={l.projects.length} current={openLead === l.group} onClick={() => onLead(l.group)} />
        ))}
      </SidebarSection>
    </>
  );
}
