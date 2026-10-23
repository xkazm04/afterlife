// One project's page, decided once on the server: how deep the data source reads it (the deep project: its decisions,
// records, tasks, events and tracks; any other: what its fleet row says) and what its buttons do in this mode. The
// sections only draw their slice. A button is a link (in the app, or out to GitLab), disabled with the reason, or (demo
// mode only) a simulated flash.
import type { ActionClass, FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { feedRows, gitlabUrl, type FeedRow } from '../inspector';
import type { DeepProject, FleetSource, FleetTask } from '../types';

export type FleetMode = FleetSource['mode'];

export type ProjectAction = { label: string; variant?: 'primary' | 'accent' } & (
  | { kind: 'link'; href: string }
  /** Out of the app (the project's GitLab page): opened in a new tab, without an opener. */
  | { kind: 'external'; href: string }
  | { kind: 'disabled'; reason: string }
  | { kind: 'flash'; text: string }
);

/** What waits: not set up, the deep project's decisions, a count from the fleet row, or nothing. */
export type NeedsSlice = { kind: 'unwatched' } | { kind: 'decisions'; items: NeedsYouItem[] } | { kind: 'count'; n: number } | { kind: 'none' };

/** The tasks the source lists (the deep project's), or the project they are listed for. */
export type TasksSlice = { kind: 'list'; tasks: FleetTask[] } | { kind: 'elsewhere'; deepId: string };

/** [time, track, text]: the deep project's recent events, or the one last event of a fleet row (null: none). */
export type EventsSlice = { kind: 'list'; rows: [string, string, string][] } | { kind: 'last'; row: [string, string, string] | null };

interface Common {
  needs: NeedsSlice;
  tasks: TasksSlice;
  events: EventsSlice;
  feed: { rows: FeedRow[]; demoCockpit: boolean };
  /** The class records by class id; empty where the source reads none. */
  records: Record<string, ActionClass>;
}

export type ProjectDepth = (Common & { kind: 'deep'; tracks: { deep: DeepProject; demo: boolean } }) | (Common & { kind: 'summary' });

export interface ProjectView {
  id: string;
  name: string;
  /** portfolio/group/id */
  path: string;
  deepId: string;
  /** The project's GitLab page, when the source read one (live, a polled project). */
  webUrl: string | null;
  mode: FleetMode;
  depth: ProjectDepth;
  actions: ProjectAction[];
}

export interface ProjectContext {
  portfolio: string;
  deepId: string;
  source: FleetSource;
}

function needsOf(p: FleetProject, deep: DeepProject | null): NeedsSlice {
  if (p.state === 'not-set-up') return { kind: 'unwatched' };
  if (deep) return { kind: 'decisions', items: deep.needs };
  return p.needsYou ? { kind: 'count', n: p.needsYou } : { kind: 'none' };
}

/** `deep` is the source's deep read, given only for the deep project. */
export function projectView(p: FleetProject, deep: DeepProject | null, ctx: ProjectContext): ProjectView {
  const { source } = ctx;
  const common = { needs: needsOf(p, deep), feed: { rows: feedRows(p, deep), demoCockpit: source.illustrative.cockpit } };
  const depth: ProjectDepth = deep
    ? {
        kind: 'deep', ...common, records: deep.actionClasses, tasks: { kind: 'list', tasks: deep.tasks },
        events: { kind: 'list', rows: source.events }, tracks: { deep, demo: source.illustrative.tracks },
      }
    : {
        kind: 'summary', ...common, records: {}, tasks: { kind: 'elsewhere', deepId: ctx.deepId },
        events: { kind: 'last', row: p.last ? [p.last.at, p.last.track, p.last.text] : null },
      };
  const core = { id: p.id, name: p.name, path: `${ctx.portfolio}/${p.group}/${p.id}`, deepId: ctx.deepId, webUrl: p.webUrl ?? null, mode: source.mode, depth };
  return { ...core, actions: projectActions(core, source.mode) };
}

/** The page's buttons for this mode. Demo keeps its simulation; live never flashes a demo text. */
export function projectActions(v: Pick<ProjectView, 'name' | 'path' | 'deepId' | 'depth' | 'webUrl'>, mode: FleetMode): ProjectAction[] {
  const demo = mode === 'demo';
  if (v.depth.needs.kind === 'unwatched') {
    return [
      demo
        ? { label: 'Set up…', variant: 'accent', kind: 'flash', text: `Setup opens a bootstrap MR in ${v.name} (demo)` }
        : { label: 'Set up…', variant: 'accent', kind: 'link', href: '/setup' },
    ];
  }
  if (v.depth.needs.kind !== 'count') return [];
  return demo
    ? [
        { label: 'Review queue', variant: 'primary', kind: 'flash', text: `Opening the queue for ${v.name} (demo)` },
        { label: 'Open in GitLab', kind: 'flash', text: `${gitlabUrl(v.path)} (demo, no network)` },
      ]
    : [
        { label: 'Review queue', variant: 'primary', kind: 'disabled', reason: `Needs you lists ${v.deepId}’s decisions only` },
        v.webUrl ? { label: 'Open in GitLab', kind: 'external', href: v.webUrl } : { label: 'Open in GitLab', kind: 'disabled', reason: 'the index stores no GitLab address yet' },
      ];
}
