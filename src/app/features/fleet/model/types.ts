// Types of the Fleet screen model. Everything here is plain data; the logic lives beside it in model/.
import type { ActionClass, FleetProject, NeedsYouItem, ProjectState, TierInfo, TierKey, Track } from '@/lib/demo/types';
import type { CostJoin } from '@/lib/runs/desk/join';
import type { Stability } from '@/lib/stability/stability';
import type { TrendFeed } from '@/lib/trend/trend';

export type FleetView = 'tiers' | 'classes' | 'stages';

/** The six smart filters of the sidebar (and the toolbar lozenge). */
export type SmartId = 'needs' | 'stale' | 'setup' | 'unwatched' | 'quar' | 'handsoff';

/** What the list shows: everything, one group ("g:payments"), one smart filter, or what changed since the last look. */
export type Source = 'all' | SmartId | 'changed' | `g:${string}`;

export type SortKey =
  | 'attention'
  | 'name'
  | 'state'
  | 'needs'
  | 'proofs'
  | 'stages'
  | 'feed'
  | `tier:${TierKey}`
  | `class:${string}`
  | `stage:${number}`;

export interface FleetFilters {
  source: Source;
  q: string;
  /** Empty set = no restriction. */
  states: ReadonlySet<ProjectState>;
  /** Projects that have at least one class at one of these tiers. */
  tiers: ReadonlySet<TierKey>;
}

/** The projects of one group after filtering and sorting. */
export interface GroupBlock {
  group: string;
  projects: FleetProject[];
}

/** A stored proof verdict, word for word. INCONCLUSIVE and UNKNOWN are never a pass. */
export type TaskVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'UNKNOWN';

/** One task of the deep project, as the inspector lists it (a link to /task/<id>). */
export interface FleetTask {
  id: string;
  title: string;
  mr: string | null;
  track: string;
  state: string;
  /** null: no proof is stored for it. */
  verdict: TaskVerdict | null;
}

/**
 * The deep data the data source has for one project (ledgerline): its decisions, class records, tasks and tracks. Read on
 * the server for that project's page only (model/project/view.ts); the /fleet client never receives it.
 */
export interface DeepProject {
  id: string;
  needs: NeedsYouItem[];
  actionClasses: Record<string, ActionClass>;
  /** The data source's tasks (getTasks), in its order. */
  tasks: FleetTask[];
  tracks: Track[];
  running: string;
  webhooks: string;
  unattributed: number;
  /** Where the deep project stands in its improvement cycles (the only project with a cycle history in the demo). */
  cycle: { running: string | null; closed: number; held: number; gained: number };
}

/** Everything the Fleet screen reads, loaded on the server and passed to the client screen. */
export interface FleetData {
  portfolio: string;
  projects: FleetProject[];
  groups: string[];
  classes: string[];
  stages: string[];
  tiers: Record<TierKey, TierInfo>;
  /** The project the source reads deep (its page lists decisions, tasks and tracks). */
  deepId: string;
  /** The deep project's class records for the tier popover, by class id: "16/15 accepted". Classes with no record are absent. */
  records: Record<string, string>;
  /** null: no poll read yet. */
  lastPollSec: number | null;
}

/**
 * What the Fleet reads that differs between the two sources on purpose (parity.test.ts lists it): the mode, and the deep
 * project's recent events, which are the demo's feed in demo mode and read from the index in live mode.
 */
export interface FleetSource {
  mode: 'demo' | 'live';
  /** [time, track, text], newest first. */
  events: [string, string, string][];
  /** Demo text shown beside live data, to be labelled: the deep project's tracks, and the cockpit text (webhooks too). */
  illustrative: { tracks: boolean; cockpit: boolean };
}

/** What the column builder needs to know besides the view. */
export interface FleetMeta {
  classes: readonly string[];
  stages: readonly string[];
  tiers: Record<TierKey, TierInfo>;
}

/**
 * What Fleet draws beside its projects, never in FleetProject (the demo/live parity holds without it), read on the server
 * per project and summed per group, never per person. `cost`: the cycle runner's spend joined onto the projects
 * (src/lib/runs/desk/join.ts; real local runs in both modes); null: not read. `stability`: each project's agent MRs over
 * the last 7 days, by project id (the DataSource's getStability); an absent project: not read. `trend`: the fleet's last
 * 28 UTC days, one row per project a day (the DataSource's getFleetTrend; seeded in the demo); absent or null: not read.
 */
export interface FleetEstate {
  cost: CostJoin | null;
  stability: Readonly<Record<string, Stability>> | null;
  trend?: TrendFeed | null;
}
