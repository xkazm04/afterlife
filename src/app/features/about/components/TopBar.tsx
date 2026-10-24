// The film's top bar: the breadcrumb (Afterlife › About), the way into the app and the one line that says what
// Afterlife is. Esc follows whichever link `out` names (keys/leave.ts): the breadcrumb back to the door when the viewer
// came from it, "Enter Afterlife" otherwise, so that link carries the ref and aria-keyshortcuts.
import Link from 'next/link';
import type { Ref } from 'react';
import type { LeaveHref } from '../keys/leave';
import s from './topbar.module.css';

export function TopBar({ out, escRef }: { out: LeaveHref; escRef: Ref<HTMLAnchorElement> }) {
  const esc = (href: LeaveHref) => (href === out ? { ref: escRef, 'aria-keyshortcuts': 'Escape' } : {});
  return (
    <header className={s.top}>
      <div className={s.row}>
        <nav className={s.crumbs} aria-label="Breadcrumb">
          <Link href="/" data-role="about-door" {...esc('/')}>
            Afterlife
          </Link>
          <span className={s.sep} aria-hidden="true">
            ›
          </span>
          <span aria-current="page">About</span>
        </nav>
        <Link className={s.enter} href="/fleet" data-role="about-enter" {...esc('/fleet')}>
          Enter Afterlife
        </Link>
      </div>
      <p className={s.line}>
        Eight AI agents on your GitLab group. <em>Agents may act alone only where they can prove it.</em>
      </p>
    </header>
  );
}
