import { DetailPage } from '@/components/shell/detail/DetailPage';
import { StateGlyph } from '@/components/status/StateGlyph';
import { plural } from '@/lib/format/plural';
import type { FleetProjectView } from '../../data/loadFleetProject';
import { projectLede, waitingTitle } from '../../model/inspector';
import { FleetLegend } from '../legend/FleetLegend';
import { ClassesSection } from '../inspector/sections/ClassesSection';
import { EventsSection } from '../inspector/sections/EventsSection';
import { FeedSection } from '../inspector/sections/FeedSection';
import { ImprovementSection } from '../inspector/sections/ImprovementSection';
import { NeedsYouSection } from '../inspector/sections/NeedsYouSection';
import { ProofsSection } from '../inspector/sections/ProofsSection';
import { StagesSection } from '../inspector/sections/StagesSection';
import { TasksSection } from '../inspector/sections/tasks/TasksSection';
import { TracksSection } from '../inspector/sections/TracksSection';

/**
 * /fleet/[project]: one project as short cards (what waits, classes, proofs, tasks, stages, improvement, feed, events, tracks).
 * How deep the project is read and what its buttons do were decided on the server (`view`); each section draws its slice.
 */
export function ProjectDetail({ project: p, data, view }: FleetProjectView) {
  const { depth } = view;
  // An unwatched project's count is shown nowhere (the row, the group sum), so the status bar counts none either.
  const waiting = p.state === 'not-set-up' ? 0 : p.needsYou;
  return (
    <DetailPage
      parent={{ label: 'Fleet', href: '/fleet' }}
      title={p.name}
      subtitle={`${data.portfolio}/${p.group}/${p.id}`}
      lede={
        <>
          <StateGlyph state={p.state} /> {projectLede(p)}
        </>
      }
      status={`${p.name} · ${waitingTitle(waiting, p.state === 'stale' && waiting > 0)} · ${plural(data.projects.length, 'project')} in the fleet`}
      help={<FleetLegend tiers={data.tiers} keys={false} />}
      helpTitle="Legend"
    >
      <NeedsYouSection p={p} needs={depth.needs} actions={view.actions} live={view.mode === 'live'} />
      <ClassesSection p={p} classes={data.classes} records={depth.records} />
      <ProofsSection p={p} />
      <TasksSection tasks={depth.tasks} />
      <StagesSection p={p} stages={data.stages} />
      <ImprovementSection p={p} cycle={depth.kind === 'deep' ? depth.tracks.deep.cycle : null} />
      <FeedSection {...depth.feed} />
      <EventsSection events={depth.events} live={view.mode === 'live'} />
      {depth.kind === 'deep' ? <TracksSection {...depth.tracks} /> : null}
    </DetailPage>
  );
}
