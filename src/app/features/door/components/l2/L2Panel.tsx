'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FleetProject, NeedsYouItem, Track } from '@/lib/demo/types';
import { TRACK_COUNT } from '@/lib/tiers';
import { needsOf } from '../../model/city';
import { ageStr, plural, staleText, waitWords } from '../../model/words';
import { DOOR_TIERS, tierLabel } from '../rail/Rail';
import { TierLetter } from '../ui/TierLetter';
import { Demo } from './Demo';
import styles from './l2panel.module.css';

export interface Deep {
  id: string;
  cockpit: { running: string; doingNow: string; goingWell: string; needsMe: string };
  needs: readonly NeedsYouItem[];
  tracks: readonly Track[];
  /** Demo text the source serves beside live data (live mode): labelled, so it never passes for live. */
  illustrative: { cockpit: boolean; tracks: boolean };
}

function Num({ v, k, tone }: { v: React.ReactNode; k: string; tone?: string }) {
  return (
    <div className={styles.num}>
      <div className={`${styles.v} ${tone ? styles[tone] : ''}`}>{v}</div>
      <div className={styles.k}>{k}</div>
    </div>
  );
}

function Exit({ href, children, enter }: { href: string; children: string; enter?: boolean }) {
  return (
    <Link className={enter ? styles.enter : styles.exit} href={href}>
      {children}
      {enter ? null : <span>↗</span>}
    </Link>
  );
}

/**
 * The project's page beside its cutaway: state, numbers, then (ledgerline) its decisions and tracks; exits at the foot.
 * The cockpit lines and the tracks are labelled demo when the source still serves them from the demo (live mode).
 */
export function L2Panel({ p, group, classes, deep, rungs, enter = '/fleet' }: { p: FleetProject; group: string; classes: readonly string[]; deep: Deep; rungs: number; enter?: string }) {
  const [pick, setPick] = useState(0);
  const nsu = p.state === 'not-set-up';
  const stale = p.state === 'stale';
  const isDeep = p.id === deep.id;
  const n = needsOf(p);
  const nulls = classes.filter((k) => p.classTiers?.[k] == null).length;
  const at = (t: string): number => classes.filter((k) => p.classTiers?.[k] === t).length; // no record / split: never a quarantine
  const known = p.stages.filter((x) => x != null).length;
  const d = deep.needs[pick] ?? deep.needs[0];
  return (
    <div className={styles.panel} data-role="door-l2-panel">
      <div className={styles.scroll}>
        <h1 className={styles.name} data-role="door-l2-name">
          {p.name}
        </h1>
        <div className={styles.sub}>
          {group}
          {p.what ? ` · ${p.what}` : ''}
        </div>
        <div className={styles.state}>
          {nsu ? <span className={styles.u}>not watched · unknown, not zero</span> : null}
          {stale ? <span className={styles.st}>stale · {staleText(p)}</span> : null}
          {p.state === 'setting-up' ? `setting up · ${p.setupStep ?? 'step unknown'}` : null}
          {p.state === 'watching' ? (
            <>
              <span className={styles.ok}>watching</span> · polled {ageStr(p.feed.ageSec) ?? 'unknown'}
            </>
          ) : null}
        </div>
        <div className={styles.nums}>
          {nsu ? (
            ['decisions', 'tracks armed', 'proofs, 7 days', 'demotions, 7 days'].map((k) => <Num key={k} v="unknown" k={k} tone="u" />)
          ) : (
            <>
              <Num v={n} k={`${waitWords(n)}${stale ? ' · last known' : ''}`} tone={n ? (stale ? 'st' : 'a') : undefined} />
              {p.armed === null ? <Num v="unknown" k="tracks armed · not read" tone="u" /> : <Num v={<>{p.armed}<small> / {TRACK_COUNT}</small></>} k="tracks armed" />}
              {p.proofs7d ? <Num v={<>{p.proofs7d.pass}<small> / </small><span className={p.proofs7d.fail ? styles.f : undefined}>{p.proofs7d.fail}</span></>} k={`pass / fail${p.proofs7d.inconclusive ? ` · ${p.proofs7d.inconclusive} inconclusive` : ''} · 7 days`} /> : <Num v="unknown" k="proofs, 7 days" tone="u" />}
              {p.demotions7d == null ? <Num v="unknown" k="demotions, 7 days" tone="u" /> : <Num v={p.demotions7d} k={`${plural(p.demotions7d, 'demotion')} · 7 days`} />}
              {p.craOpen > 0 ? <Num v={p.craOpen} k={`CRA ${plural(p.craOpen, 'clock')}${isDeep ? ' · seeded drill' : ' open'}`} /> : null}
            </>
          )}
        </div>
        {isDeep ? (
          <>
            <dl className={styles.ck}>
              <dt>Running</dt>
              <dd>
                {deep.cockpit.running}
                <Demo on={deep.illustrative.cockpit} />
              </dd>
              <dt>Doing now</dt>
              <dd>
                {deep.cockpit.doingNow}
                <Demo on={deep.illustrative.cockpit} />
              </dd>
              <dt>Going well</dt>
              <dd>
                {deep.cockpit.goingWell}
                <Demo on={deep.illustrative.cockpit} />
              </dd>
              <dt>Needs me</dt>
              <dd>
                <span className={styles.a}>{deep.needs.length} {plural(deep.needs.length, 'decision')}</span>
              </dd>
            </dl>
            <div className={styles.block}>
              {deep.needs.map((x, i) => (
                <button key={x.id} type="button" className={`${styles.dec} ${i === pick ? styles.on : ''}`} onPointerEnter={() => setPick(i)} onFocus={() => setPick(i)}>
                  <i className={styles.dmark} />
                  <span>{x.title}</span>
                  {x.kind === 'signoff' ? <span className={styles.seeded}>seeded drill</span> : /!44(?!\d)/.test(x.reason ?? '') ? <span className={styles.seeded}>seeded</span> : null}
                </button>
              ))}
              {d ? (
                <div className={styles.does}>
                  <b>{d.title}</b> · {d.does}
                </div>
              ) : null}
            </div>
            <div className={styles.block}>
              <h3>
                Tracks · {deep.tracks.filter((t) => t.armed).length} of {deep.tracks.length} armed
                <Demo on={deep.illustrative.tracks} />
              </h3>
              <div className={styles.tracks}>
                {deep.tracks.map((t) => (
                  <span key={t.id} className={styles.trk} title={t.name}>
                    <i className={!t.armed ? styles.off : t.proof.status === 'blocked' ? styles.blk : undefined} />
                    <b>{t.id}</b>
                    {t.key}
                    {t.needs ? <span className={styles.nd} title="needs a person" /> : null}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : !nsu ? (
          <>
            <div className={styles.block}>
              <h3>Autonomy by class</h3>
              <div className={styles.tiers}>
                {DOOR_TIERS.filter((t) => at(t) > 0).map((t) => (
                  <span key={t}>
                    <TierLetter tier={t} />
                    {at(t)} {tierLabel(t)}
                  </span>
                ))}
                {nulls ? (
                  <span className={styles.u}>
                    <TierLetter tier={null} />
                    {nulls} unknown
                  </span>
                ) : null}
              </div>
            </div>
            <div className={styles.block}>
              <h3>Stages</h3>
              <div className={styles.line}>
                {known} of {rungs} rungs known{known < rungs ? <span className={styles.u}> · {rungs - known} unknown</span> : null}
              </div>
            </div>
            {p.last ? (
              <div className={styles.block}>
                <h3>Latest{stale ? ' · last known' : ''}</h3>
                <div className={styles.line}>
                  <span className={styles.mono}>
                    {p.last.at} {p.last.track}
                  </span>{' '}
                  · {p.last.text}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.line}>
            Afterlife has no agents here and has never polled it. Tracks, tiers, proofs and stages are <b>unknown, not zero</b>.
          </div>
        )}
      </div>
      <div className={styles.exits}>
        <Exit href={enter} enter>
          Enter Afterlife
        </Exit>
        {n > 0 ? <Exit href="/needs-you">Needs you</Exit> : null}
        {at('quarantined') > 0 ? <Exit href="/ladder">Ladder</Exit> : null}
        {!nsu ? <Exit href="/maturity">Maturity</Exit> : null}
        {isDeep ? <Exit href="/task">Task</Exit> : null}
        {isDeep ? <Exit href="/theater">Theater</Exit> : null}
        {nsu || p.state === 'setting-up' ? <Exit href="/setup">Setup</Exit> : null}
      </div>
    </div>
  );
}
