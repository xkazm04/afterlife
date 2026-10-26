'use client';

import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { useHostNav } from '@/components/shell/host';

export type Scope = 'project' | 'estate';

/**
 * Where each scope lives. The project scope names itself (?scope=project) rather than dropping the query: the screen
 * host sends a link with no query of its own back to the query the screen was left with, which from the estate is the
 * estate again.
 */
export const SCOPE_HREF: Record<Scope, string> = { project: '/cycles?scope=project', estate: '/cycles?scope=estate' };

/**
 * One project's cycles, or every project in cycles rolled up per group. The scope is in the URL (?scope=estate). It paints
 * before the data: `project` (the deep project's short name) is a dash until the stream names it.
 */
export function ScopeSwitch({ scope, project }: { scope: Scope; project?: string }) {
  const nav = useHostNav();
  return (
    <SegmentedControl<Scope>
      label="Scope"
      value={scope}
      options={[
        { value: 'project', label: project ?? '—', title: `${project ?? 'The project'}: every cycle, every stage` },
        { value: 'estate', label: 'Estate', title: 'Every project in cycles, per group' },
      ]}
      onChange={(v) => nav.navigate(SCOPE_HREF[v])}
    />
  );
}
