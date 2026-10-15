'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import { APP_NAV, SETTINGS_NAV } from '@/components/shell/sidebar/navItems';
import bottom from './bottom.module.css';
import styles from './chrome.module.css';

/** Every screen of the app, from the sidebar's own list (Settings included), so the menu cannot drift from it. */
export const SCREENS: readonly (readonly [string, string])[] = [...APP_NAV, SETTINGS_NAV].map((e) => [e.label, e.href] as const);

/**
 * Escape closes the open menu and is claimed, so the door's own Esc (up a level) does not also fire on the same press:
 * `useDoor` skips a key whose default is prevented.
 */
export function claimEscape(e: { key: string; preventDefault: () => void }): boolean {
  if (e.key !== 'Escape') return false;
  e.preventDefault();
  return true;
}

/** Top left: the brand plate. Top right: the way in, and every screen. */
export const TopChrome = memo(function TopChrome({ org, asOf }: { org: string; asOf: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? claimEscape(e) : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close, true);
    };
  }, [open]);
  return (
    <>
      <header className={`${styles.chrome} ${styles.tl}`}>
        <div className={styles.brand} data-role="door-brand">
          <Image src="/brand/belay-b-knot.svg" alt="" width={22} height={22} unoptimized style={{ verticalAlign: '-5px', marginRight: 8 }} />
          Afterlife
          <small>
            {org} · as of {asOf}
          </small>
        </div>
      </header>
      <div ref={ref} className={`${styles.chrome} ${styles.tr}`}>
        <div className={styles.row}>
          <Link className={styles.enter} href="/fleet" data-role="door-enter">
            Enter Afterlife
          </Link>
          <button type="button" className={styles.menuBtn} aria-expanded={open} aria-controls="door-menu" aria-label="Screens, all of the app" onClick={() => setOpen((v) => !v)}>
            Screens<span className={styles.cv}>▾</span>
          </button>
        </div>
        {open ? (
          <ul id="door-menu" className={styles.menu}>
            {SCREENS.map(([name, href]) => (
              <li key={href}>
                <Link href={href}>
                  {name}
                  <span>{href}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
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
