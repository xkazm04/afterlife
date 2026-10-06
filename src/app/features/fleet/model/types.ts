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

/** The deep data the demo has for one project (ledgerline): its decisions, class records, events and tracks. */
export interface DeepProject {
  id: string;
  needs: NeedsYouItem[];
  actionClasses: Record<string, ActionClass>;
  events: [string, string, string][];
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

/** What the column builder needs to know besides the view. */
export interface FleetMeta {
  classes: readonly string[];
  stages: readonly string[];
  tiers: Record<TierKey, TierInfo>;
}
