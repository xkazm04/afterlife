'use client';

import { useMemo, type MouseEvent } from 'react';
import type { PopoverApi } from '@/components/overlays/popover/usePopover';
import { groupNavId } from '@/components/table/model/rowNavigation';
import type { FleetProject, TierKey } from '@/lib/demo/types';
import { TierPopover } from '../components/popover/TierPopover';
import type { RowHandlers } from '../components/table/types';
import type { FleetData } from '../model/types';
import { useEvent } from './useEvent';
import type { useFleetList } from './useFleetList';
import type { useFleetMenus } from './useFleetMenus';

/**
 * The callbacks every table row receives. Their identities never change (useEvent), so selecting a row re-renders
 * only the row that lost the selection and the one that gained it.
 */
export function useRowHandlers(o: {
  data: FleetData;
  list: ReturnType<typeof useFleetList>;
  menus: ReturnType<typeof useFleetMenus>;
  pop: PopoverApi;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
}): RowHandlers {
  const { onSelect, onActivate } = o;
  const onContextMenu = useEvent((id: string, e: MouseEvent) => {
    o.pop.close();
    o.menus.openRow(id, e.clientX, e.clientY);
  });
  const onGroupContextMenu = useEvent((g: string, e: MouseEvent) => {
    o.pop.close();
    o.menus.openRow(groupNavId(g), e.clientX, e.clientY);
  });
  const onToggleGroup = useEvent((g: string) => o.list.toggleGroup(g));
  const onTierEnter = useEvent((el: HTMLElement, p: FleetProject, tier: TierKey) => {
    if (o.menus.isOpen) return;
    o.pop.show(el, <TierPopover p={p} tier={tier} classes={o.data.classes} deep={o.data.deep} />, { delay: true });
  });
  const onTierLeave = useEvent(() => o.pop.hide());
  return useMemo(
    () => ({ onSelect, onActivate, onContextMenu, onToggleGroup, onGroupContextMenu, onTierEnter, onTierLeave }),
    [onSelect, onActivate, onContextMenu, onToggleGroup, onGroupContextMenu, onTierEnter, onTierLeave],
  );
}
