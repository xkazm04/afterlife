// The Monitor's shapes: what the server loader hands the screen, and the per-lead summary the model derives.
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';

export interface MonitorData {
  /** Whether the data is the demo fixture or the live index: what Resolve, Re-poll and the poll age may claim. */
  mode: 'demo' | 'live';
  /** The GitLab group ("acme-lab") and the time the data describes ("14:22"). */
  org: string;
  asOf: string;
  groups: readonly string[];
  projects: readonly FleetProject[];
  stages: readonly string[];
  /** The one project with deep data; its decisions resolve on a click. */
  deepId: string;
  needs: readonly NeedsYouItem[];
  lastPollSec: number;
}

/** The six signals the sidebar lights across every lead. */
export type MarkKind = 'needs' | 'stale' | 'quar' | 'setup' | 'unwatched' | 'watching';

/** One lead: a group and its projects, with the counts its plate and readout show. */
export interface Lead {
  group: string;
  projects: readonly FleetProject[];
  needs: number;
  stale: number;
  setup: number;
  unwatched: number;
  watching: number;
  quar: number;
}

/** Fleet-wide counts: the headline and the sidebar marks. */
export interface Totals extends Omit<Lead, 'group' | 'projects'> {
  n: number;
  /** Projects with at least one decision waiting. */
  needsP: number;
  pass: number;
  fail: number;
}
