'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/components/controls/Button';
import { useHostNav } from '@/components/shell/host';
import { useShellInfo } from '@/components/shell/ShellContext';
import { dataLabel } from '@/components/shell/bars/dataLabel';
import { TOUR, nextStop, tourNote } from '../callouts/tour';
import { xrayStore } from '../model/store';
import type { CalloutKind, TourStop } from '../model/types';
import type { Part } from './useParts';
import styles from './panel.module.css';

const HEADING: Record<CalloutKind, string> = {
  module: 'This screen',
  columns: 'Columns',
  activity: 'What to do',
  shell: 'Around it',
};

/**
 * The X-ray's docked panel, bottom right of the window: the parts of this screen as a numbered list (click, or ← → while
 * the panel has focus), the next screen of the tour (it navigates as a sidebar click does: the screen host draws it in
 * place), and the way out. It names the data it
 * labels, so demo numbers are never mistaken for yours.
 */
export function XrayPanel({ stop, parts, active, path }: { stop: TourStop | null; parts: Part[]; active: number; path: string }) {
  const nav = useHostNav();
  const { data } = useShellInfo();
  const panel = useRef<HTMLElement>(null);
  const next = nextStop(stop?.key ?? null);
  const n = stop?.callouts.length ?? 0;
  const go = (i: number) => xrayStore.setStep(path, Math.max(0, Math.min(n - 1, i)));
  const goScreen = (s: TourStop) => nav.navigate(`${s.href}?xray=1`);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[aria-current="step"], button')?.focus({ preventScroll: true });
  }, [stop?.key]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(active + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(active - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section ref={panel} data-xray-panel className={styles.panel} aria-label="X-ray" onKeyDown={onKey}>
      <header className={styles.panelHead}>
        <span className={styles.kicker}>X-ray</span>
        <b>{stop ? stop.label : 'This screen'}</b>
        <span className={styles.dim}>{stop ? `screen ${TOUR.indexOf(stop) + 1} of ${TOUR.length}` : 'not labelled'}</span>
        <button type="button" className={styles.close} aria-label="Turn X-ray off" title="Turn X-ray off (Esc)" onClick={() => xrayStore.setOn(false)}>
          ×
        </button>
      </header>
      {stop ? (
        <ol className={styles.list}>
          {parts.map((p, i) => (
            <Fragment key={p.callout.id}>
              {i === 0 || parts[i - 1]?.callout.kind !== p.callout.kind ? (
                <li role="presentation" className={styles.heading}>
                  {HEADING[p.callout.kind]}
                </li>
              ) : null}
              <li>
                <button type="button" className={styles.item} aria-current={i === active ? 'step' : undefined} onClick={() => go(i)} data-missing={p.box ? undefined : ''}>
                  <span className={styles.itemNum}>{p.n}</span>
                  {p.callout.title}
                  {p.box ? null : <span className={styles.off}>not on screen now</span>}
                </button>
              </li>
            </Fragment>
          ))}
        </ol>
      ) : (
        <p className={styles.note}>{tourNote()}</p>
      )}
      <div className={styles.actions}>
        {stop ? (
          <>
            <Button variant="ghost" aria-label="Previous part" disabled={active === 0} onClick={() => go(active - 1)}>
              ‹
            </Button>
            <Button variant="ghost" aria-label="Next part" disabled={active >= n - 1} onClick={() => go(active + 1)}>
              ›
            </Button>
          </>
        ) : null}
        {next ? (
          <Button variant="accent" onClick={() => goScreen(next)}>
            {stop ? `Next screen: ${next.label}` : `Start at ${next.label}`}
          </Button>
        ) : (
          <Button variant="accent" href="/trace">
            Trace my own group
          </Button>
        )}
      </div>
      <footer className={styles.panelFoot}>
        <span className={styles.honest}>{dataLabel(data)}</span>
        <Link href="/about">What is Afterlife?</Link>
        <span className={styles.dim}>X toggles · Esc leaves · ← → step</span>
      </footer>
    </section>
  );
}
