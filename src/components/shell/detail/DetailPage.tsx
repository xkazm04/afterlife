import Link from 'next/link';
import type { ReactNode } from 'react';
import { Window, type WindowProps } from '../Window';
import { PaneScroll } from '../PaneScroll';
import styles from './detail.module.css';

export interface DetailPageProps extends Pick<WindowProps, 'subtitle' | 'toolbar' | 'sidebar' | 'status' | 'help' | 'helpTitle'> {
  /** The list this page hangs off: shown as the back link, e.g. { label: 'Fleet', href: '/fleet' }. */
  parent: { label: string; href: string };
  /** The thing the page is about (a project name, a class, a stage). */
  title: string;
  /** One line under the title; the page's answer, not a description. */
  lede?: ReactNode;
  children: ReactNode;
}

/**
 * A nested detail page (/fleet/[project], /ladder/[class] ...): the same Window as its list, no inspector, and a
 * readable column in the pane. The title row carries the way back; sections stack as DetailSection cards. Replaces
 * the right-hand inspector drawer on the screens that moved to nested pages.
 */
export function DetailPage({ parent, title, lede, children, ...win }: DetailPageProps) {
  const back = (
    <Link className={styles.back} href={parent.href} aria-label={`Back to ${parent.label}`}>
      <span aria-hidden>‹</span> {parent.label}
    </Link>
  );
  return (
    <Window title={title} {...win} toolbar={<>{back}{win.toolbar}</>}>
      <PaneScroll>
        <div className={styles.col}>
          <h1 className={styles.h}>{title}</h1>
          {lede ? <p className={styles.lede}>{lede}</p> : null}
          <div className={styles.grid}>{children}</div>
        </div>
      </PaneScroll>
    </Window>
  );
}

/** One card on a detail page. Keep it to a heading and one idea; long reference text belongs behind a tooltip. */
export function DetailSection({ title, aux, wide, children }: { title: string; aux?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`${styles.card} ${wide ? styles.wide : ''}`}>
      <h2 className={styles.ch}>
        {title}
        {aux ? <span className={styles.aux}>{aux}</span> : null}
      </h2>
      {children}
    </section>
  );
}
