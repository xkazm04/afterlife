// Types of the Fleet screen model. Everything here is plain data; the logic lives beside it in model/.
import type { ActionClass, FleetProject, NeedsYouItem, ProjectState, TierInfo, TierKey, Track } from '@/lib/demo/types';

export type FleetView = 'tiers' | 'classes' | 'stages';

/** The six smart filters of the sidebar (and the toolbar lozenge). */
export type SmartId = 'needs' | 'stale' | 'setup' | 'unwatched' | 'quar' | 'handsoff';

/** What the list shows: everything, one group ("g:payments") or one smart filter. */
export type Source = 'all' | SmartId | `g:${string}`;

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

/** The deep data the data source has for one project (ledgerline): its decisions, class records, tasks and tracks. */
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
}

/** Everything the Fleet screen reads, loaded on the server and passed to the client screen. */
export interface FleetData {
  portfolio: string;
  projects: FleetProject[];
  groups: string[];
  classes: string[];
  stages: string[];
  tiers: Record<TierKey, TierInfo>;
  deep: DeepProject;
  lastPollSec: number;
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
