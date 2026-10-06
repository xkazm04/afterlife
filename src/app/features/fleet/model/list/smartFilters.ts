// The six smart filters: the sidebar list and the toolbar lozenge both use them.
import type { FleetProject } from '@/lib/demo/types';
import type { SmartId } from '../types';

export interface SmartFilter {
  id: SmartId;
  label: string;
  test: (p: FleetProject) => boolean;
}

export const SMART_FILTERS: readonly SmartFilter[] = [
  { id: 'needs', label: 'Needs you', test: (p) => p.needsYou > 0 },
  { id: 'stale', label: 'Stale', test: (p) => p.state === 'stale' },
  { id: 'setup', label: 'Setting up', test: (p) => p.state === 'setting-up' },
  { id: 'unwatched', label: 'Not watched', test: (p) => p.state === 'not-set-up' },
  { id: 'quar', label: 'Has quarantine', test: (p) => p.tiers.quarantined > 0 },
  { id: 'handsoff', label: 'Hands-off', test: (p) => p.tiers.hands_off > 0 },
];

export const smartFilter = (id: SmartId): SmartFilter => SMART_FILTERS.find((s) => s.id === id) ?? SMART_FILTERS[0]!;

export const countSmart = (projects: readonly FleetProject[], id: SmartId): number => projects.filter(smartFilter(id).test).length;
