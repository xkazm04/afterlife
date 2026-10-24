import { DetailPage } from '@/components/shell/detail/DetailPage';
import { StateGlyph } from '@/components/status/StateGlyph';
import { plural } from '@/lib/format/plural';
import type { FleetProjectView } from '../../data/loadFleetProject';
import { needsSum } from '../../model/groups';
import { projectLede, waitingTitle } from '../../model/inspector';
import { FleetLegend } from '../legend/FleetLegend';
import type { FleetEstate } from '../../model/types';
import { ClassesSection } from '../inspector/sections/ClassesSection';
import { CostSection } from '../inspector/sections/cost/CostSection';
import { StabilitySection } from '../inspector/sections/stability/StabilitySection';
import { TrendSection } from '../inspector/sections/trend/TrendSection';
import { EventsSection } from '../inspector/sections/EventsSection';
import { FeedSection } from '../inspector/sections/FeedSection';
import { ImprovementSection } from '../inspector/sections/ImprovementSection';
import { NeedsYouSection } from '../inspector/sections/NeedsYouSection';
import { ProofsSection } from '../inspector/sections/ProofsSection';
import { StagesSection } from '../inspector/sections/StagesSection';
import { TasksSection } from '../inspector/sections/tasks/TasksSection';
import { TracksSection } from '../inspector/sections/TracksSection';

/**
 * /fleet/[project]: one project as short cards (what waits, classes, proofs, tasks, stages, improvement, agent cost, stability,
 * trend, feed, events, tracks).
 * How deep the project is read and what its buttons do were decided on the server (`view`); each section draws its slice.
 * `estate` is what the route reads beside the fleet (agent cost, stability, the 28-day trend); absent, its cards say not read.
 */
export function ProjectDetail({ project: p, data, view, estate }: FleetProjectView & { estate?: FleetEstate }) {
  const { depth } = view;
  // needsSum, the rule of the row and the group sum: an unwatched project's count is shown nowhere, so it counts none here either.
  const waiting = needsSum([p]);
  return (
    <DetailPage
      parent={{ label: 'Fleet', href: '/fleet' }}
      title={p.name}
      subtitle={view.path}
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
      <CostSection id={p.id} cost={estate?.cost} />
      <StabilitySection s={estate?.stability?.[p.id]} demo={view.mode === 'demo'} />
      <TrendSection id={p.id} feed={estate?.trend} />
      <FeedSection {...depth.feed} />
      <EventsSection events={depth.events} live={view.mode === 'live'} />
      {depth.kind === 'deep' ? <TracksSection {...depth.tracks} /> : null}
    </DetailPage>
  );
}
