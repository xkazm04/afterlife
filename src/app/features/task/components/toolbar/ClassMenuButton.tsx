'use client';

import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { useMenu } from '@/components/overlays/menu/useMenu';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { PROOF_CLASSES } from '../../data/pageFacts';
import { classCount } from '../../model/docket/filters';
import type { DocketRow } from '../../model/docket/row';

/**
 * The proof-class filter: the only way to filter by class (it has no sidebar mirror). Items show how many tasks each has;
 * `tasks` absent (the docket not read yet): every count is a dash.
 */
export function ClassMenuButton({ tasks, value, onChange }: { tasks?: readonly Pick<DocketRow, 'cls'>[]; value: string; onChange: (cls: string) => void }) {
  const count = (n: () => number): string => (tasks ? String(n()) : '—');
  const items = (): MenuEntry[] => [
    { head: 'Proof class' },
    { label: 'All classes', checked: value === 'all', sc: count(() => tasks?.length ?? 0), run: () => onChange('all') },
    { sep: true },
    ...PROOF_CLASSES.map((c) => ({ label: c, checked: value === c, sc: count(() => classCount(tasks ?? [], c)), run: () => onChange(c) })),
  ];
  const menu = useMenu();
  // useMenu closes an open menu on a click on its own trigger, whether or not a press came first.
  return (
    <>
      <PopupButton
        icon="filter"
        active={value !== 'all'}
        title="Filter by proof class"
        expanded={menu.isOpen}
        onClick={(e) => menu.openFrom(e.currentTarget, { items: items(), highlightFirst: false })}
      >
        {value === 'all' ? 'All classes' : value}
      </PopupButton>
      {menu.menu}
    </>
  );
}
