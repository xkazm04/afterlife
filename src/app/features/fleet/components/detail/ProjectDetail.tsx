import type { ReactNode } from 'react';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { Reveal, Unread } from '@/components/shell/host';
import { StateGlyph } from '@/components/status/StateGlyph';
import { plural } from '@/lib/format/plural';
import type { ProjectCore } from '../../data/loadFleetProject';
import { needsSum } from '../../model/groups';
import { projectLede, waitingTitle } from '../../model/inspector';
import { UNREAD_FLEET } from '../../model/screen/unread';
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
import { CardPending, CORE_CARDS, LATE_CORE_CARDS } from './ProjectPending';
import styles from './detail.module.css';

/** A card in its place on the grid, entering on its row when its slice lands. */
const Card = ({ order, slice, children }: { order: number; slice: string; children: ReactNode }) => (
  <Reveal order={order} slice={slice} className={styles.cell}>
    {children}
  </Reveal>
);

/**
 * /fleet/[project]: one project as short cards (what waits, classes, proofs, tasks, stages, improvement, agent cost, stability,
 * trend, feed, events, tracks).
 * How deep the project is read and what its buttons do were decided on the server (`core.view`); each section draws its
 * slice. `core` absent: not read yet (the screen host's core slice), every card from the project a dash; `coreError`:
 * why it could not be read. `estate` is what is read beside it (agent cost, stability, the 28-day trend), each part null
 * until read: its cards say not read.
 */
export function ProjectDetail({ id, core, estate, coreError }: { id: string; core?: ProjectCore; estate?: FleetEstate; coreError?: string }) {
  const p = core?.project;
  const view = core?.view;
  // needsSum, the rule of the row and the group sum: an unwatched project's count is shown nowhere, so it counts none here either.
  const waiting = p ? needsSum([p]) : 0;
  const pending = (cards: readonly (readonly [string, number])[]) =>
    cards.map(([title, order]) => (
      <Card key={title} order={order} slice="core">
        <CardPending title={title} reason={coreError} />
      </Card>
    ));
  return (
    <DetailPage
      parent={{ label: 'Fleet', href: '/fleet' }}
      title={p?.name ?? id}
      subtitle={view?.path ?? '—'}
      lede={
        p ? (
          <>
            <StateGlyph state={p.state} /> {projectLede(p)}
          </>
        ) : (
          <Unread label="the project is not read yet" />
        )
      }
      status={
        p && core ? (
          `${p.name} · ${waitingTitle(waiting, p.state === 'stale' && waiting > 0)} · ${plural(core.fleetSize, 'project')} in the fleet`
        ) : (
          <>
            {id} · <Unread label="decisions not read yet" /> · <Unread label="fleet size not read yet" /> projects in the fleet
          </>
        )
      }
      help={<FleetLegend tiers={core?.meta.tiers ?? UNREAD_FLEET.tiers} keys={false} />}
      helpTitle="Legend"
    >
      {p && view && core ? (
        <>
          <Card order={1} slice="core">
            <NeedsYouSection p={p} needs={view.depth.needs} actions={view.actions} live={view.mode === 'live'} />
          </Card>
          <Card order={1} slice="core">
            <ClassesSection p={p} classes={core.meta.classes} records={view.depth.records} />
          </Card>
          <Card order={2} slice="core">
            <ProofsSection p={p} />
          </Card>
          <Card order={2} slice="core">
            <TasksSection tasks={view.depth.tasks} />
          </Card>
          <Card order={3} slice="core">
            <StagesSection p={p} stages={core.meta.stages} />
          </Card>
          <Card order={3} slice="core">
            <ImprovementSection p={p} cycle={view.depth.kind === 'deep' ? view.depth.tracks.deep.cycle : null} />
          </Card>
        </>
      ) : (
        pending(CORE_CARDS)
      )}
      <Card order={4} slice="desk">
        <CostSection id={id} cost={estate?.cost} />
      </Card>
      <Card order={4} slice="estate">
        <StabilitySection s={estate?.stability?.[id]} demo={view?.mode === 'demo'} />
      </Card>
      <Card order={5} slice="estate">
        <TrendSection id={id} feed={estate?.trend} />
      </Card>
      {view ? (
        <>
          <Card order={5} slice="core">
            <FeedSection {...view.depth.feed} />
          </Card>
          <Card order={6} slice="core">
            <EventsSection events={view.depth.events} live={view.mode === 'live'} />
          </Card>
          {view.depth.kind === 'deep' ? (
            <Card order={6} slice="core">
              <TracksSection {...view.depth.tracks} />
            </Card>
          ) : null}
        </>
      ) : (
        pending(LATE_CORE_CARDS)
      )}
    </DetailPage>
  );
}
