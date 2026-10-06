import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { histRows } from '../../model/rows/history';
import { decisionCounts } from '../../model/rows/rowState';
import type { Action, NeedsState, ShowFilter } from '../../model/types';
import { DecisionGlyph } from '../shared/DecisionGlyph';

const FILTERS: readonly { show: ShowFilter; label: string; glyph: 'open' | 'wait' | 'stg' | 'ok'; count: 'all' | 'waiting' | 'outbox' | 'decided' }[] = [
  { show: 'all', label: 'All', glyph: 'open', count: 'all' },
  { show: 'waiting', label: 'Waiting', glyph: 'wait', count: 'waiting' },
  { show: 'outbox', label: 'In outbox', glyph: 'stg', count: 'outbox' },
  { show: 'sent', label: 'Decided', glyph: 'ok', count: 'decided' },
];

/** Sidebar filters: All, Waiting, In outbox, Decided, and the week's history. */
export function NeedsSidebar({ s, dispatch }: { s: NeedsState; dispatch: (a: Action) => void }) {
  const counts = decisionCounts(s);
  return (
    <>
      <SidebarSection title="Decisions">
        {FILTERS.map((f) => (
          <SidebarItem key={f.show} icon={<DecisionGlyph kind={f.glyph} />} label={f.label} count={counts[f.count]} current={s.show === f.show} onClick={() => dispatch({ type: 'show', show: f.show })} />
        ))}
      </SidebarSection>
      <SidebarSection title="History">
        <SidebarItem icon={<DecisionGlyph kind="dash" />} label="This week" count={histRows(s).length} onClick={() => dispatch({ type: 'openHistory' })} />
      </SidebarSection>
    </>
  );
}
