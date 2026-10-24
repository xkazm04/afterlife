// The film's top bar: the breadcrumb (Afterlife › About), the data-mode pill, the way into the app (Esc does the same)
// and the one line that says what Afterlife is.
import Link from 'next/link';
import type { Ref } from 'react';
import type { AboutMode } from '../model/beats';
import s from './topbar.module.css';

export function TopBar({ mode, enterRef }: { mode: AboutMode; enterRef: Ref<HTMLAnchorElement> }) {
  return (
    <header className={s.top}>
      <div className={s.row}>
        <nav className={s.crumbs} aria-label="Breadcrumb">
          <Link href="/">Afterlife</Link>
          <span className={s.sep} aria-hidden="true">
            ›
          </span>
          <span aria-current="page">About</span>
        </nav>
        <div className={s.right}>
          <span className={`${s.pill} ${mode.mode === 'demo' ? s.demo : s.live}`} data-role="about-mode">
            <i aria-hidden="true" />
            {mode.label}
          </span>
          <Link ref={enterRef} className={s.enter} href="/fleet" data-role="about-enter" aria-keyshortcuts="Escape">
            Enter Afterlife
          </Link>
        </div>
      </div>
      <p className={s.line}>
        Eight AI agents on your GitLab group. <em>Agents may act alone only where they can prove it.</em>
      </p>
    </header>
  );
}
