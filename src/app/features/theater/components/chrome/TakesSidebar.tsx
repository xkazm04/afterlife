import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { TAKES } from '../../data/constants';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import type { Marks } from '../../model/types';
import styles from './TakesSidebar.module.css';

function Tno({ children, current, seeded }: { children: string | number; current?: boolean; seeded?: boolean }) {
  return <span className={[styles.tno, seeded ? styles.seeded : '', current ? styles.current : ''].filter(Boolean).join(' ')}>{children}</span>;
}

/** Sidebar sections: Takes 1-8 with their roll counts, and the Marks (in / out). */
export function TakesSidebar({ take, counts, range, marked, actions }: { take: number; counts: readonly number[]; range: Marks; marked: boolean; actions: TheaterActions }) {
  return (
    <>
      <SidebarSection title="Takes">
        <div role="group" aria-label="Takes">
          {TAKES.map((t, k) => (
            <SidebarItem
              key={t.name}
              icon={
                <Tno current={k === take} seeded={t.seeded}>
                  {k + 1}
                </Tno>
              }
              label={t.name}
              count={counts[k] ? `${counts[k]}×` : undefined}
              current={k === take}
              title={`Seq ${t.a}–${t.b}${t.seeded ? ' · seeded' : ''} · key ${k + 1}`}
              onClick={() => actions.cue(k)}
            />
          ))}
        </div>
      </SidebarSection>
      <SidebarSection title="Marks">
        <SidebarItem icon={<Tno>I</Tno>} label="In point" count={<span className={marked ? styles.marked : undefined}>{range.a}</span>} title="Mark the in-point at the current seq (I)" onClick={actions.markIn} />
        <SidebarItem icon={<Tno>O</Tno>} label="Out point" count={<span className={marked ? styles.marked : undefined}>{range.b}</span>} title="Mark the out-point at the current seq (O)" onClick={actions.markOut} />
      </SidebarSection>
    </>
  );
}
