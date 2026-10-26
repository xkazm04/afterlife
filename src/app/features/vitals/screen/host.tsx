'use client';

// Vitals' screens for the screen host (docs/features/screen-host.md); the slices are screen/slices.ts. Both read this
// machine's files: a request from elsewhere fails every slice with 'not-local' and the pane says so.
// /vitals reveal order:
//   0  window, the table's place                                                  at once
//   1  the projects (name, root, host, CI, cloud)                                 config
//   -  each row's last collected and runs stored fill in place                    runs
// /vitals/[project] reveal order:
//   0  window, toolbar (back, Refresh), the slug as the subtitle                   at once
//   1  Delivery (ci)   2  Production (prod)   3  Adjustments (adjustments)   4  the inspector (ci)
//   -  the collect notice, last collected and the status line fill in place        config, job, ci
// An unknown slug answers notFound: the project's own not-found window.
import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { listRows, pendingOf, vitalsView, type ListSlices, type VitalsSlices } from '../model/slices';
import { VitalsListScreen } from '../VitalsListScreen';
import { VitalsScreen } from '../VitalsScreen';

type Data<S> = S extends { state: 'ok'; data: infer T } ? T : never;

function ListFrame() {
  const config = useSlice<Data<ListSlices['config']>>('config');
  const runs = useSlice<Data<ListSlices['runs']>>('runs');
  const read = runs.state === 'ok' ? runs.data : undefined;
  const reason = pendingOf(config);
  return (
    <VitalsListScreen
      projects={config.state === 'ok' ? listRows(config.data.projects, read?.bySlug) : undefined}
      now={read?.now}
      reason={typeof reason === 'string' ? reason : undefined}
    />
  );
}

function ProjectFrame({ params }: ScreenFrameProps) {
  const slices: VitalsSlices = {
    config: useSlice('config'),
    job: useSlice('job'),
    ci: useSlice('ci'),
    prod: useSlice('prod'),
    adjustments: useSlice('adjustments'),
  };
  const { view, pending } = vitalsView(params.project ?? '', slices);
  return <VitalsScreen view={view} pending={pending} />;
}

/** An unknown /vitals/<project>: no saved project has that slug; links back to the list of real projects. */
function ProjectNotFound() {
  return (
    <EntityNotFound
      title="Project not found"
      note="No onboarded project has that slug. Onboard it first, or pick one from the list."
      href="/vitals"
      back="Back to Vitals"
    />
  );
}

export const screens: readonly ScreenDef[] = [
  { key: 'vitals', ready: true, slices: ['config', 'runs'], Frame: ListFrame, title: () => 'Afterlife · Vitals' },
  {
    key: 'vitals/[project]',
    ready: true,
    slices: ['config', 'job', 'ci', 'prod', 'adjustments'],
    Frame: ProjectFrame,
    title: (p) => `Afterlife · Vitals · ${p.project}`,
    NotFound: ProjectNotFound,
  },
];
