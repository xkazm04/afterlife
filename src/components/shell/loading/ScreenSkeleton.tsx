import type { ReactNode } from 'react';
import { Window } from '../Window';
import styles from './ScreenSkeleton.module.css';

/** The shape of the screen that is streaming in, so the pane does not jump when it lands. */
export type SkeletonLayout = 'table' | 'cards' | 'grid' | 'lanes' | 'sections';

const bars = (n: number, cls: string | undefined, step = 37): ReactNode[] =>
  Array.from({ length: n }, (_, i) => <span key={i} className={cls} style={{ width: `${94 - ((i * step) % 34)}%` }} />);

const block = (cls: string | undefined, rows: number): ReactNode => <div className={cls}>{bars(rows, styles.bar)}</div>;

const SHAPES: Record<SkeletonLayout, () => ReactNode> = {
  // a filter strip, the column header and the rows of an outline table (Fleet, Runs)
  table: () => (
    <>
      <span className={styles.strip} />
      <span className={styles.head} />
      {bars(12, styles.row)}
    </>
  ),
  // a row of figure cards over a table (Onboard)
  cards: () => (
    <>
      <div className={styles.cards}>{Array.from({ length: 4 }, (_, i) => <span key={i} className={styles.card} />)}</div>
      <span className={styles.head} />
      {bars(8, styles.row)}
    </>
  ),
  // the wide stage grid card over the selected cycle's detail (Cycles)
  grid: () => (
    <>
      <span className={styles.grid} />
      {block(styles.section, 5)}
    </>
  ),
  // the answer band over the leads' lanes (Monitor)
  lanes: () => (
    <>
      <span className={styles.band} />
      {Array.from({ length: 6 }, (_, i) => <span key={i} className={styles.lane} />)}
    </>
  ),
  // a detail page: the title, its lede and a column of section cards (/fleet/<project>)
  sections: () => (
    <div className={styles.column}>
      <span className={styles.title} />
      <span className={styles.row} style={{ width: '60%' }} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.section}>
          {bars(3, styles.bar)}
        </div>
      ))}
    </div>
  ),
};

/**
 * A route's own loading window (`<route>/loading.tsx`): the real Window titled as the screen titles itself, with a pane
 * shaped like the screen (table rows, cards, grid, lanes or detail sections), while its data streams in. It reads
 * nothing at request time, so it is part of the static shell and paints the moment the navigation starts.
 */
export function ScreenSkeleton({ title, layout }: { title: string; layout: SkeletonLayout }) {
  return (
    <Window title={title} subtitle="loading" status="Loading…">
      <div className={styles.pane} role="status" aria-busy="true" aria-label={`Loading ${title}`} data-layout={layout}>
        {SHAPES[layout]()}
      </div>
    </Window>
  );
}
