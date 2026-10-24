'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import bottom from './bottom.module.css';
import styles from './chrome.module.css';

/** Top left: the brand plate, and what this is (About, told from the door). Top right: the way in. */
export const TopChrome = memo(function TopChrome({ org, asOf }: { org: string; asOf: string }) {
  return (
    <>
      <header className={`${styles.chrome} ${styles.tl}`}>
        <div className={styles.brand} data-role="door-brand">
          <Image src="/brand/belay-b-knot.svg" alt="" width={22} height={22} unoptimized style={{ verticalAlign: '-5px', marginRight: 8 }} />
          Afterlife
          <small>
            {org} · as of {asOf}
          </small>
          <Link className={styles.about} href="/about?from=door" data-role="door-about">
            What is this?
          </Link>
        </div>
      </header>
      <div className={`${styles.chrome} ${styles.tr}`}>
        <Link className={styles.enter} href="/fleet" data-role="door-enter">
          Enter Afterlife
        </Link>
      </div>
    </>
  );
});

/** Bottom left: where you are, with the way back. Bottom right: the keys. */
export const BottomChrome = memo(function BottomChrome({ crumbs, onBack, onGo }: { crumbs: readonly { label: string; go?: 0 | 1 }[]; onBack: (() => void) | null; onGo: (level: 0 | 1) => void }) {
  return (
    <>
      <nav className={`${bottom.chrome} ${bottom.bl}`} aria-label="Where you are">
        <div className={bottom.crumbs}>
          {onBack ? (
            <button type="button" className={bottom.back} onClick={onBack}>
              ← Back
            </button>
          ) : null}
          {crumbs.map((c, i) => (
            <span key={i} className={bottom.crumb}>
              {i ? <span className={bottom.sep}>›</span> : null}
              {c.go != null ? (
                <button type="button" onClick={() => onGo(c.go!)}>
                  {c.label}
                </button>
              ) : (
                <span className={i === crumbs.length - 1 ? bottom.cur : undefined} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
              )}
            </span>
          ))}
        </div>
      </nav>
      <div className={`${bottom.chrome} ${bottom.br}`}>
        <div className={bottom.keys}>
          <span>
            <kbd>Esc</kbd>back
          </span>
          <span>
            <kbd>Enter</kbd>open
          </span>
          <span>
            <kbd>Tab</kbd>move
          </span>
        </div>
      </div>
    </>
  );
});
