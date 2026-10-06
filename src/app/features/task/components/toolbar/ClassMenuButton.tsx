'use client';

import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { useMenu } from '@/components/overlays/menu/useMenu';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { PROOF_CLASSES } from '../../data/pageFacts';
import { classCount } from '../../model/docket/filters';
import type { TaskView } from '../../model/types';

/** The proof-class filter: the only way to filter by class (it has no sidebar mirror). Items show how many tasks each has. */
export function ClassMenuButton({ tasks, value, onChange }: { tasks: readonly TaskView[]; value: string; onChange: (cls: string) => void }) {
  const items = (): MenuEntry[] => [
    { head: 'Proof class' },
    { label: 'All classes', checked: value === 'all', sc: String(tasks.length), run: () => onChange('all') },
    { sep: true },
    ...PROOF_CLASSES.map((c) => ({ label: c, checked: value === c, sc: String(classCount(tasks, c)), run: () => onChange(c) })),
  ];
  const menu = useMenu();
  return (
    <>
      <PopupButton
        icon="filter"
        active={value !== 'all'}
        title="Filter by proof class"
        aria-expanded={menu.isOpen}
        onClick={(e) => (menu.isOpen ? menu.close() : menu.openFrom(e.currentTarget, { items: items(), highlightFirst: false }))}
      >
        {value === 'all' ? 'All classes' : value}
      </PopupButton>
      {menu.menu}
    </>
  );
}
