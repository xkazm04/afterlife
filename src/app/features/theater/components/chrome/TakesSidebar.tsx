import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import type { Marks, Take } from '../../model/types';
import styles from './TakesSidebar.module.css';

function Tno({ children, current, seeded }: { children: string | number; current?: boolean; seeded?: boolean }) {
  return <span className={[styles.tno, seeded ? styles.seeded : '', current ? styles.current : ''].filter(Boolean).join(' ')}>{children}</span>;
}

/** Sidebar sections: the film's takes (1-8 by key; one per MR on a real film) with their roll counts, and the Marks. */
export function TakesSidebar({ takes, take, counts, range, marked, actions }: { takes: readonly Take[]; take: number; counts: readonly number[]; range: Marks; marked: boolean; actions: TheaterActions }) {
  return (
    <>
      <SidebarSection title="Takes">
        <div role="group" aria-label="Takes">
          {takes.map((t, k) => (
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
              title={`${t.mr != null ? 'belay-ledger · ' : ''}Seq ${t.a}–${t.b}${t.seeded ? ' · seeded' : ''}${k < 8 ? ` · key ${k + 1}` : ''}`}
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
