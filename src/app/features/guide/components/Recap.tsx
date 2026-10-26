'use client';

import { useHostNav } from '@/components/shell/host';
import { CLAIM, RECAP } from '../model/recap';
import { guideStore } from '../model/store';
import styles from './recap.module.css';

/**
 * The last step: the six ideas the story showed, each with the step that replays it and the real screen it lives on.
 * Opening a screen ends the guide there; the way on is setting up a first project of your own.
 */
export function Recap() {
  const nav = useHostNav();
  const leave = (href: string) => {
    guideStore.close();
    nav.navigate(href);
  };
  return (
    <div className={styles.recap}>
      <div className={styles.card} role="dialog" aria-label="What you watched">
        <h2>
          {CLAIM.lead}
          <em>{CLAIM.mark}</em>.
        </h2>
        <div className={styles.grid}>
          {RECAP.map((r) => (
            <div key={r.name} className={styles.it}>
              <b>{r.name}</b>
              <span>{r.line}</span>
              <div className={styles.links}>
                <button type="button" onClick={() => guideStore.send({ type: 'go', to: r.step })}>
                  Replay it
                </button>
                <button type="button" onClick={() => leave(r.href)}>
                  See it on {r.href}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.cta}>
          <button type="button" className={styles.primary} onClick={() => leave('/start')}>
            Set up your first project: /start
          </button>
          <button type="button" onClick={() => leave('/needs-you')}>
            Open Needs you
          </button>
          <button type="button" className={styles.quiet} onClick={() => guideStore.open(0)}>
            Watch again
          </button>
        </div>
      </div>
    </div>
  );
}
