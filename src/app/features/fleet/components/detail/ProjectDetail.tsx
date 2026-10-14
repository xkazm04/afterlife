import { DetailPage } from '@/components/shell/detail/DetailPage';
import { StateGlyph } from '@/components/status/StateGlyph';
import { plural } from '@/lib/format/plural';
import type { FleetProjectView } from '../../data/loadFleetProject';
import { projectLede } from '../../model/inspector';
import { FleetLegend } from '../legend/FleetLegend';
import { ClassesSection } from '../inspector/sections/ClassesSection';
import { EventsSection } from '../inspector/sections/EventsSection';
import { FeedSection } from '../inspector/sections/FeedSection';
import { NeedsYouSection } from '../inspector/sections/NeedsYouSection';
import { ProofsSection } from '../inspector/sections/ProofsSection';
import { StagesSection } from '../inspector/sections/StagesSection';
import { TasksSection } from '../inspector/sections/TasksSection';
import { TracksSection } from '../inspector/sections/TracksSection';

/** /fleet/[project]: one project as short cards (what waits, classes, proofs, tasks, stages, feed, events, tracks). */
export function ProjectDetail({ project: p, data, source }: FleetProjectView) {
  const deep = data.deep;
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
      status={`${p.name} · ${plural(p.needsYou, 'decision')} waiting · ${data.projects.length} projects in the fleet`}
      help={<FleetLegend tiers={data.tiers} />}
      helpTitle="Legend"
    >
      <NeedsYouSection p={p} portfolio={data.portfolio} deep={deep} live={source.mode === 'live'} />
      <ClassesSection p={p} classes={data.classes} deep={deep} />
      <ProofsSection p={p} />
      <TasksSection p={p} deep={deep} />
      <StagesSection p={p} stages={data.stages} />
      <FeedSection p={p} deep={deep} demoCockpit={source.illustrative.cockpit} />
      <EventsSection p={p} deep={deep} source={source} />
      {p.id === deep.id ? <TracksSection deep={deep} demo={source.illustrative.tracks} /> : null}
    </DetailPage>
  );
}
