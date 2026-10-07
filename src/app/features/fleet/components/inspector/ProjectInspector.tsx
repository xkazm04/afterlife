'use client';

import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { StateGlyph } from '@/components/status/StateGlyph';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../hooks/useSectionOpen';
import type { DeepProject, FleetData, FleetSource } from '../../model/types';
import { ClassesSection } from './sections/ClassesSection';
import { EventsSection } from './sections/EventsSection';
import { FeedSection } from './sections/FeedSection';
import { NeedsYouSection } from './sections/NeedsYouSection';
import { ProofsSection } from './sections/ProofsSection';
import { StagesSection } from './sections/StagesSection';
import { TasksSection } from './sections/TasksSection';
import { TracksSection } from './sections/TracksSection';

/** Layer 2 for one project: what waits for you, its classes, proofs, tasks, stages, feed and recent events. */
export function ProjectInspector({
  p,
  data,
  deep,
  source,
  done,
  onResolve,
  onFlash,
  section,
}: {
  p: FleetProject;
  data: Pick<FleetData, 'portfolio' | 'classes' | 'stages'>;
  deep: DeepProject;
  source: FleetSource;
  done: ReadonlySet<string>;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
  section: (key: string, defaultOpen?: boolean) => SectionProps;
}) {
  return (
    <>
      <InspectorHeader icon={<StateGlyph state={p.state} />} title={p.name} sub={`${p.what || p.group} · ${STATE_LABEL[p.state]}`} path={`${data.portfolio}/${p.group}/${p.id}`} />
      <NeedsYouSection p={p} portfolio={data.portfolio} deep={deep} live={source.mode === 'live'} done={done} onResolve={onResolve} onFlash={onFlash} sec={section('ny')} />
      <ClassesSection p={p} classes={data.classes} deep={deep} sec={section('cls')} />
      <ProofsSection p={p} sec={section('prf')} />
      <TasksSection p={p} deep={deep} sec={section('tsk')} />
      <StagesSection p={p} stages={data.stages} sec={section('stg')} />
      <FeedSection p={p} deep={deep} sec={section('feed')} />
      <EventsSection p={p} deep={deep} source={source} sec={section('ev')} />
      {p.id === deep.id ? <TracksSection deep={deep} sec={section('trk', false)} /> : null}
    </>
  );
}
