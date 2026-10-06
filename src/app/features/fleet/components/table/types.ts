// What the rows of the Fleet table can ask their screen to do. The callbacks are stable (useEvent), so a row
// only re-renders when its own project, selection or the view changes.
import type { MouseEvent } from 'react';
import type { FleetProject, TierKey } from '@/lib/demo/types';

export interface RowHandlers {
  /** A row id (project) or "g:<group>". */
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onContextMenu: (id: string, e: MouseEvent) => void;
  onToggleGroup: (group: string) => void;
  onGroupContextMenu: (group: string, e: MouseEvent) => void;
  onTierEnter: (el: HTMLElement, project: FleetProject, tier: TierKey) => void;
  onTierLeave: () => void;
}
