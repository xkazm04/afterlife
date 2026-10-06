'use client';

import Link from 'next/link';
import { needsOf, type District } from '../../model/city';
import { plural } from '../../model/words';
import { TierLetter } from '../ui/TierLetter';
import styles from './rail.module.css';

const TIERS = [
  ['hands_off', 'Hands-off'],
  ['supervised', 'Supervised'],
  ['assisted', 'Assisted'],
  ['quarantined', 'Quarantined'],
  ['human_only', 'Human only'],
] as const;

function Ico({ kind }: { kind: 'stale' | 'setup' | 'nsu' }) {
  return (
    <svg className={styles.ico} viewBox="0 0 22 22" aria-hidden>
      {kind === 'stale' ? <rect x="2" y="2" width="18" height="18" rx="3" style={{ fill: 'url(#d-hatch)', stroke: 'var(--stale)' }} /> : null}
      {kind === 'setup' ? (
        <>
          <rect x="3" y="3" width="16" height="16" style={{ fill: 'none', stroke: 'var(--accent)', strokeDasharray: '3 2' }} />
          <circle cx="11" cy="11" r="2.4" style={{ fill: 'var(--accent)' }} />
        </>
      ) : null}
      {kind === 'nsu' ? <rect x="3" y="3" width="16" height="16" style={{ fill: 'none', stroke: 'var(--unknown)', strokeDasharray: '3 2.5' }} /> : null}
    </svg>
  );
}

/**
 * The open district's list (L1): who needs you, most first; then stale, setting up and not watched, each saying why;
 * then how many are calm. A row lights its tower; a click opens the project. Exits go into the app.
 */
export function Rail({ d, hotId, onHover, onOpen }: { d: District; hotId: string | null; onHover: (id: string | null) => void; onOpen: (id: string) => void }) {
  const ps = d.placed.map((t) => t.p);
  const need = ps.filter((p) => needsOf(p) > 0).sort((a, b) => needsOf(b) - needsOf(a) || a.name.localeCompare(b.name));
  const stale = ps.filter((p) => p.state === 'stale');
  const setup = ps.filter((p) => p.state === 'setting-up');
  const nsu = ps.filter((p) => p.state === 'not-set-up');
  const calm = ps.filter((p) => p.state === 'watching' && needsOf(p) === 0).length;
  const row = (id: string, body: React.ReactNode) => (
    <button
      key={id}
      type="button"
      data-role="door-rail-row"
      className={`${styles.row} ${hotId === id ? styles.hot : ''}`}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onClick={() => onOpen(id)}
    >
      {body}
    </button>
  );
  const sec = (title: string, n: number, amber: boolean, rows: React.ReactNode[]) =>
    rows.length ? (
      <div className={styles.sec}>
        <h3>
          {title} <span className={amber ? styles.ca : styles.c}>{n}</span>
        </h3>
        {rows}
      </div>
    ) : null;
  return (
    <aside className={styles.rail} aria-label={`${d.name} district`} data-role="door-rail">
      <div className={styles.head}>
        <h2 data-role="door-rail-title">
          {d.needP} of {d.n} {plural(d.needP, 'needs', 'need')} you
        </h2>
        <p>pick any project to open it</p>
      </div>
      <div className={styles.body}>
        {sec('Needs you', d.needs, true, need.map((p) => row(p.id, <><span className={styles.cnt}>{needsOf(p)}</span><span className={styles.nm}>{p.name}</span>{p.state === 'stale' ? <span className={styles.tag}>last known</span> : null}</>)))}
        {sec('Stale', stale.length, false, stale.map((p) => row(p.id, <><Ico kind="stale" /><span className={styles.nm}>{p.name}<span className={`${styles.sub} ${styles.st}`}>{p.feed.error ?? 'feed stale'}</span></span></>)))}
        {sec('Setting up', setup.length, false, setup.map((p) => row(p.id, <><Ico kind="setup" /><span className={styles.nm}>{p.name}<span className={styles.sub}>{p.setupStep ?? 'step unknown'}</span></span></>)))}
        {sec('Not watched', nsu.length, false, nsu.map((p) => row(p.id, <><Ico kind="nsu" /><span className={styles.nm}>{p.name}<span className={styles.sub}>unknown, not zero</span></span></>)))}
        <p className={styles.calm}>
          Watching, nothing waits: <b>{calm}</b>
        </p>
      </div>
      <div className={styles.foot}>
        <div className={styles.legend}>
          {TIERS.map(([t, name]) => (
            <span key={t}>
              <TierLetter tier={t} />
              {name}
            </span>
          ))}
        </div>
        <Link className={styles.enter} href="/fleet">
          Enter Afterlife
        </Link>
        {d.needs ? <Link className={styles.exit} href="/needs-you">Needs you<span>↗</span></Link> : null}
        {d.quar ? <Link className={styles.exit} href="/ladder">Ladder<span>↗</span></Link> : null}
        {d.setup || d.nsu ? <Link className={styles.exit} href="/setup">Setup<span>↗</span></Link> : null}
      </div>
    </aside>
  );
}
