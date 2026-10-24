'use client';

import { useId } from 'react';
import type { Layout } from './useParts';
import styles from './xray.module.css';

const PAD = 4;

/**
 * The X-ray itself, drawn over the real window: a blueprint wash with the active part cut out clear and outlined,
 * every other part just a number chip, a leader line to the card that says what the part is and what to do with it. It never takes a
 * click from the app (pointer-events none): parts are picked in the panel.
 */
export function XrayLayer({ layout, active }: { layout: Layout; active: number }) {
  const mask = `${useId()}hole`;
  const grid = `${useId()}grid`;
  const { area, parts, card, line, text } = layout;
  const target = parts[active]?.box ?? null;
  const c = parts[active]?.callout;
  return (
    <>
      <svg className={styles.svg} width={area.w} height={area.h} aria-hidden="true">
        <defs>
          <pattern id={grid} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" className={styles.gridLine} />
          </pattern>
          <mask id={mask}>
            <rect width={area.w} height={area.h} fill="white" />
            {target ? <rect x={target.x - PAD} y={target.y - PAD} width={target.w + 2 * PAD} height={target.h + 2 * PAD} rx="6" fill="black" /> : null}
          </mask>
        </defs>
        <rect width={area.w} height={area.h} className={styles.wash} mask={`url(#${mask})`} />
        <rect width={area.w} height={area.h} fill={`url(#${grid})`} mask={`url(#${mask})`} />
        {target ? (
          <rect
            key={c?.id}
            x={target.x - PAD}
            y={target.y - PAD}
            width={target.w + 2 * PAD}
            height={target.h + 2 * PAD}
            rx="6"
            pathLength={100}
            className={styles.outlineOn}
          />
        ) : null}
        {line ? <line key={`${active}-line`} {...line} className={styles.leader} /> : null}
        {line ? <circle cx={line.x2} cy={line.y2} r="3.5" className={styles.dot} /> : null}
      </svg>
      {parts.map((p, i) =>
        p.box ? (
          <span
            key={p.callout.id}
            aria-hidden="true"
            className={`${styles.badge} ${i === active ? styles.badgeOn : ''}`}
            style={{ left: Math.max(2, p.box.x - 12), top: Math.max(2, p.box.y - 12) }}
          >
            {p.n}
          </span>
        ) : null,
      )}
      {c ? (
        <div
          data-xray-card
          key={c.id}
          className={styles.card}
          role="note"
          aria-live="polite"
          aria-label={`Part ${active + 1}: ${c.title}`}
          style={card ? { left: card.x, top: card.y, width: card.w } : { left: Math.max(10, area.w / 2 - 165), top: 80, width: 330 }}
        >
          <div className={styles.cardHead}>
            <span className={styles.cardNum}>{active + 1}</span>
            <b>{c.title}</b>
          </div>
          <p className={styles.cardBody}>{text}</p>
          {c.legend ? (
            <dl className={styles.legend} aria-label="Columns">
              {c.legend.map((e) => (
                <div key={e.name} className={styles.legendRow}>
                  <dt>{e.name}</dt>
                  <dd>{e.means}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {c.try ? <p className={styles.cardTry}>Try: {c.try}</p> : null}
          {!target ? <p className={styles.cardTry}>Not on screen right now.</p> : null}
        </div>
      ) : null}
    </>
  );
}
