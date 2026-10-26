'use client';

import { useMemo } from 'react';
import { CheckingLine } from '../components/CheckingLine';
import type { StartView } from '../model/view';
import { OrbitNode } from './OrbitNode';
import { SkyLines } from './SkyLines';
import { StepCard } from './StepCard';
import { moveOf, placeLabels, starsOf } from './sky';
import { useCard } from './useCard';
import styles from './sky.module.css';

/** With no card open, one line under the orbit: what is next, and while a probe runs, what it is checking now. */
function Caption({ view }: { view: StartView }) {
  const next = view.steps.find((s) => s.key === view.current);
  const checking = next?.checking ? next : view.steps.find((s) => s.checking);
  if (!next) return null;
  // a check's own line says only what CheckingLine says with its seconds (as in StepBody): then the title stands alone
  const echo = next.checking && next.line === `checking ${next.checking.what}…`;
  return (
    <div className={styles.caption}>
      <p className={styles.next}>
        {next.state === 'done' ? null : <span className={styles.dim}>Next: </span>}
        <strong>{next.title}</strong>
        {echo ? null : ` · ${next.line}`}
      </p>
      {checking?.checking ? <CheckingLine checking={checking.checking} /> : null}
    </div>
  );
}

/**
 * Constellation: this machine glows at the centre and the steps sit on a dashed orbit around it, grouped by the place
 * they live (this machine, GitLab, Afterlife) in step order clockwise. Each link from the centre says its step's state:
 * flowing while it checks, solid once done, dashed before it is reached, broken when blocked, amber only when it waits
 * for you. Pressing a node grows its card out of that node while the orbit dims and goes inert; Esc or ✕ folds it back
 * and the node takes focus again. Arrow keys walk the orbit. Under reduced motion nothing loops or grows.
 */
export function ConstellationVariant({ view }: { view: StartView }) {
  const stars = useMemo(() => starsOf(view.steps), [view.steps]);
  const places = useMemo(() => placeLabels(stars), [stars]);
  const card = useCard(view.current);
  const keys = view.steps.map((s) => s.key);
  const open = stars.find((s) => s.step.key === card.open);
  return (
    <div className={styles.constellation}>
      <div className={styles.stage}>
        <div className={styles.sky} data-dim={open ? true : undefined} inert={!!open}>
          <SkyLines stars={stars} />
          <div className={styles.centre} aria-hidden="true">
            <span className={styles.core} />
            <span className={styles.centreName}>this machine</span>
          </div>
          {places.map((p) => (
            <span key={p.place} className={styles.place} style={{ left: `${p.pct.x}%`, top: `${p.pct.y}%` }} aria-hidden="true">
              {p.place}
            </span>
          ))}
          <div role="group" aria-label="Setup steps, from this machine to GitLab to Afterlife">
            {stars.map((s, i) => (
              <OrbitNode
                key={s.step.key}
                ref={card.refOf(s.step.key)}
                star={s}
                n={i + 1}
                of={stars.length}
                current={s.step.key === view.current}
                tabbable={s.step.key === card.at}
                open={card.open === s.step.key}
                onOpen={() => {
                  view.select(s.step.key);
                  card.openIt(s.step.key);
                }}
                onKey={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    view.select(s.step.key);
                    card.openIt(s.step.key);
                    return;
                  }
                  const to = moveOf(keys, s.step.key, e.key);
                  if (!to) return;
                  e.preventDefault();
                  card.moveTo(to);
                }}
              />
            ))}
          </div>
        </div>
        {open ? <StepCard key={open.step.key} view={view} step={open.step} from={open.pct} closing={card.closing} onClose={card.close} onClosed={card.finish} /> : null}
      </div>
      {open ? null : <Caption view={view} />}
    </div>
  );
}
