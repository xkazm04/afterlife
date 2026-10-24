// /about's static frame while the film's data streams in (the prerendered shell): the night ground, the breadcrumb and
// the way into the app. No pill: the data mode is not known yet, and an unknown mode is never shown as demo.
import Link from 'next/link';
import s from './components/film.module.css';
import t from './components/topbar.module.css';

export function AboutFrame() {
  return (
    <div className={s.root} data-role="about-frame">
      <header className={t.top}>
        <div className={t.row}>
          <nav className={t.crumbs} aria-label="Breadcrumb">
            <Link href="/">Afterlife</Link>
            <span className={t.sep} aria-hidden="true">
              ›
            </span>
            <span aria-current="page">About</span>
          </nav>
          <Link className={t.enter} href="/fleet">
            Enter Afterlife
          </Link>
        </div>
        <p className={t.line}>
          Eight AI agents on your GitLab group. <em>Agents may act alone only where they can prove it.</em>
        </p>
      </header>
      <main className={s.mid} />
    </div>
  );
}
