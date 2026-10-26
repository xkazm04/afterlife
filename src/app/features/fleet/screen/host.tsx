'use client';

// Fleet's screens for the screen host (docs/features/screen-host.md); the slices are screen/slices.ts.
// /fleet reveal order:
//   0  window chrome, toolbar (views, lozenge with dashes, Sort, Filter, Search), legend   at once
//   1  sidebar (sources, groups, smart filters with their counts)                           core
//   2  the table                                                                           core
//   3  the cycle runner strip (its slot is held from the first frame: the table never moves) desk
//   -  the trend note in the status bar and the group rows' stability enter in place        estate
// The list state (view, sort, filters) is decoded here from the URL, never streamed; back and forward between two
// /fleet?.. entries hand the list the new state.
// /fleet/[project] reveal order (by grid row):
//   0  window, back link, the project's id as its title, the legend                        at once
//   1  Needs you, Autonomy by class   2  Proofs, Tasks   3  Stages, Improvement            core
//   4  Agent cost (desk), Stability (estate)   5  Trend (estate), Feed   6  Recent events, Tracks
// An id the fleet does not have answers notFound: the project's own not-found window.
import { useMemo } from 'react';
import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';
import { useRevalidate, useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import type { ProjectCore } from '../data/loadFleetProject';
import { ProjectDetail } from '../components/detail/ProjectDetail';
import { FleetScreen } from '../FleetScreen';
import { decodeListState } from '../model/list/urlState';
import { dataOf, estateOf, reasonOf, type FleetCore, type FleetDesk, type FleetSignals, type ProjectDesk } from '../model/screen/slices';

function FleetFrame({ search }: ScreenFrameProps) {
  const core = useSlice<FleetCore>('core');
  const signals = useSlice<FleetSignals>('estate');
  const desk = useSlice<FleetDesk>('desk');
  const revalidate = useRevalidate();
  const query = search.toString();
  const start = useMemo(() => decodeListState(new URLSearchParams(query)), [query]);
  const read = dataOf(core);
  return (
    <FleetScreen
      data={read?.data}
      source={read?.source}
      start={start}
      desk={desk}
      estate={estateOf(signals, desk)}
      coreError={reasonOf(core)}
      onPolled={() => revalidate('fleet')}
    />
  );
}

function ProjectFrame({ params }: ScreenFrameProps) {
  const core = useSlice<ProjectCore>('core');
  const signals = useSlice<FleetSignals>('estate');
  const desk = useSlice<ProjectDesk>('desk');
  return <ProjectDetail id={params.project ?? ''} core={dataOf(core)} estate={estateOf(signals, desk)} coreError={reasonOf(core)} />;
}

/** An unknown /fleet/<project>: says it is the project that is missing and links back to the fleet. */
function ProjectNotFound() {
  return (
    <EntityNotFound
      title="Project not found"
      note="No project with that id is in the fleet. It may have been removed or the link is mistyped."
      href="/fleet"
      back="Back to Fleet"
    />
  );
}

export const screens: readonly ScreenDef[] = [
  { key: 'fleet', ready: true, slices: ['core', 'estate', 'desk'], Frame: FleetFrame, title: () => 'Afterlife · Fleet' },
  {
    key: 'fleet/[project]',
    ready: true,
    slices: ['core', 'estate', 'desk'],
    Frame: ProjectFrame,
    title: (p) => `Afterlife · Fleet · ${p.project}`,
    NotFound: ProjectNotFound,
  },
];
