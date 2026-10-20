import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { summarize } from '../model/replay';
import type { Cycle } from '../model/types';
import styles from './chrome.module.css';

const net = (c: Cycle): string => {
  if (c.state === 'running') return 'now';
  if (c.state === 'planned') return 'next';
  const n = summarize(c).net;
  return n > 0 ? `+${n}` : String(n);
};

/** The cycles, newest first: the planned one, the running one, then the closed ones with what each added. */
export function CyclesSidebar({ cycles, selected, onSelect }: { cycles: readonly Cycle[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <SidebarSection title="Cycles">
      {[...cycles].reverse().map((c) => (
        <SidebarItem
          key={c.id}
          icon={<i className={styles.ring} data-state={c.state} aria-hidden="true" />}
          label={`${c.id} ${c.theme}`}
          count={net(c)}
          current={c.id === selected}
          title={`${c.id} · ${c.theme} · ${c.state}`}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </SidebarSection>
  );
}
