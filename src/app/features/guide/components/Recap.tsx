'use client';

import { useHostNav } from '@/components/shell/host';
import { CLAIM, MOMENTS, RECAP_CHAPTERS } from '../model/recap';
import { guideStore } from '../model/store';
import styles from './recap.module.css';

/**
 * The last step: the path as a map. The four chapters are the sidebar's groups, each with its screens (opening one ends
 * the guide there), then the moments the story can replay, and the way on: setting up a first project of your own.
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
        <ol className={styles.grid}>
          {RECAP_CHAPTERS.map((c, i) => (
            <li key={c.key} className={styles.it}>
              <b>
                {i + 1} · {c.label}
              </b>
              <span>{c.line}</span>
              <div className={styles.links}>
                {c.screens.map((s) => (
                  <button key={s.key} type="button" onClick={() => leave(s.href)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.moments}>
          <span>Replay a moment</span>
          {MOMENTS.map((m) => (
            <button key={m.name} type="button" onClick={() => guideStore.send({ type: 'go', to: m.step })}>
              {m.name}
            </button>
          ))}
        </div>
        <div className={styles.cta}>
          <button type="button" className={styles.primary} onClick={() => leave('/start?add=1')}>
            Add your first project
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
