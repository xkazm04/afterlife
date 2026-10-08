'use client';

import { useRouter } from 'next/navigation';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';

export type Scope = 'project' | 'estate';

/** One project's cycles, or every project in cycles rolled up per group. The scope is in the URL (?scope=estate). */
export function ScopeSwitch({ scope, project }: { scope: Scope; project: string }) {
  const router = useRouter();
  return (
    <SegmentedControl<Scope>
      label="Scope"
      value={scope}
      options={[
        { value: 'project', label: project, title: `${project}: every cycle, every stage` },
        { value: 'estate', label: 'Estate', title: 'Every project in cycles, per group' },
      ]}
      onChange={(v) => router.push(v === 'estate' ? '/cycles?scope=estate' : '/cycles')}
    />
  );
}
