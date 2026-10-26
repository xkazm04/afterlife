'use client';

// /start on the screen host (docs/features/screen-host.md): Projects. Three slices: `facts` (the server's environment
// and live runtime, sync), `projects` (the ones saved on this machine, a file read, loopback only) and `repos` ("Your
// repos", git, slower, loopback only). The window and its title paint in the click's frame; the list fills the window's
// own sidebar sections when `projects` lands; the orbit (StartScreen) mounts when the facts land, and its probes stream
// from the client as they always did (GET /api/start/probe, useProbe), never through the host.
// Selection is the URL's (model/projects/saved.ts selectionOf): /start?project=<slug> is that saved project's orbit,
// bare /start (or ?add=1) the orbit of a new one. A sidebar link is a host navigation, so back/forward walk the
// selections; the orbit is keyed by it, so each project's (or the new one's) state starts over on a switch.
// Reveal order:
//   0  window chrome, title, Re-check                                   at once (StartPending until the facts land)
//   1  the heading, the source chips and the constellation of steps      facts
// When live mode has nothing to show, the (app) layout's gate (gate/LiveGate.tsx, a server read) covers the column with
// this same wizard, so the host's copy draws nothing (as the page did): one wizard, one probe.
// Kept state: the host keeps /start mounted when the person leaves it; a stack run (a proposal takes about a minute) is
// never aborted by leaving (useStack), while the probe re-runs on each showing (useProbe's effect).
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { ProjectsSidebar } from '../components/projects/ProjectsSidebar';
import { PROJECT_PARAM, projectsOf, selectionOf, type ProjectsRead } from '../model/projects/saved';
import { reposOf, type ReposRead } from '../model/stack/repos';
import type { StartFacts } from '../model/types';
import { StartScreen } from '../StartScreen';
import { StartPending } from './StartPending';

function StartFrame({ search }: ScreenFrameProps) {
  const facts = useSlice<StartFacts>('facts');
  const list = projectsOf(useSlice<ProjectsRead>('projects'));
  const repos = reposOf(useSlice<ReposRead>('repos'));
  const sel = selectionOf(search, list.projects);
  const sidebar = <ProjectsSidebar {...list} selected={sel.kind === 'add' ? null : sel.kind === 'saved' ? sel.project.slug : sel.slug} />;
  if (facts.state === 'error') return <StartPending error={facts.reason} sidebar={sidebar} />;
  if (facts.state === 'unread' || sel.kind === 'reading') return <StartPending sidebar={sidebar} />;
  if (facts.data.gate && !facts.data.rehearsal) return null; // the layout's gate covers the column with this same wizard
  if (sel.kind === 'missing') return <StartPending missing={sel.slug} sidebar={sidebar} />;
  const project = sel.kind === 'saved' ? sel.project : undefined;
  // a rehearsal is another probe address: its own instance; so is each project's orbit
  return <StartScreen key={`${search.get('rehearse') ?? ''}:${project?.slug ?? ''}`} facts={facts.data} {...repos} project={project} sidebar={sidebar} />;
}

const titleOf = (search: URLSearchParams): string => {
  const slug = search.get(PROJECT_PARAM)?.trim();
  return slug ? `Afterlife · Projects · ${slug}` : 'Afterlife · Projects';
};

export const screens: readonly ScreenDef[] = [
  { key: 'start', ready: true, slices: ['facts', 'projects', 'repos'], Frame: StartFrame, title: (_p, search) => titleOf(search) },
];
