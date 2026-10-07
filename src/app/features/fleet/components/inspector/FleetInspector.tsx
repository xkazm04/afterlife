'use client';

import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import type { FleetProject } from '@/lib/demo/types';
import { useSectionOpen } from '../../hooks/useSectionOpen';
import type { FleetData, FleetSource } from '../../model/types';
import { GroupInspector } from './GroupInspector';
import { ProjectInspector } from './ProjectInspector';

/**
 * The inspector column of the Fleet: a project, a group, or "No selection". Open sections are remembered across
 * selections. Needs-you items of the deep project resolve on a click.
 */
export function FleetInspector({
  selected,
  projects,
  byId,
  data,
  source,
  done,
  onResolve,
  onFlash,
}: {
  selected: string | null;
  projects: readonly FleetProject[];
  byId: ReadonlyMap<string, FleetProject>;
  data: FleetData;
  source: FleetSource;
  done: ReadonlySet<string>;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
}) {
  const section = useSectionOpen();
  if (!selected) return <InspectorHeader title="No selection" />;
  if (selected.startsWith('g:')) {
    const group = selected.slice(2);
    return <GroupInspector group={group} list={projects.filter((p) => p.group === group)} section={section} />;
  }
  const p = byId.get(selected);
  if (!p) return <InspectorHeader title="No selection" />;
  return <ProjectInspector p={p} data={data} deep={data.deep} source={source} done={done} onResolve={onResolve} onFlash={onFlash} section={section} />;
}
