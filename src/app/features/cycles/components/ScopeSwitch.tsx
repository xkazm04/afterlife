'use client';

import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { useHostNav } from '@/components/shell/host';

export type Scope = 'project' | 'estate';

/**
 * Where each scope lives: the project scope is the bare screen. A bare link to the screen that is showing clears its
 * query in the screen host, so from the estate it is the project scope (and from elsewhere it returns to the scope
 * Cycles was left in).
 */
export const SCOPE_HREF: Record<Scope, string> = { project: '/cycles', estate: '/cycles?scope=estate' };

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
