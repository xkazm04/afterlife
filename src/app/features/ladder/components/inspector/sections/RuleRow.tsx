'use client';

import { useId, useState, type ReactNode } from 'react';
import type { RecordSources } from '@/lib/demo/sources';
import { countKeyOf, explain, mrHref, type PromotionRule, type SourceLine } from '@/lib/promotion';
import { Chip } from '@/components/status/chip/Chip';
import styles from './sections.module.css';

/** "!103" as a GitLab link when the sources know the project's web URL, else plain text. */
function Mr({ s, iid }: { s: RecordSources; iid: number }) {
  const href = mrHref(s, iid);
  return href ? <a className={styles.mr} href={href} target="_blank" rel="noreferrer">!{iid}</a> : <span className={styles.mr}>!{iid}</span>;
}

function Lines({ head, lines, s, empty }: { head: string; lines: readonly SourceLine[]; s: RecordSources; empty?: string }) {
  if (!lines.length && !empty) return null;
  return (
    <div className={styles.srcGroup}>
      <div className={styles.srcHead}>{`${head} (${lines.length})`}</div>
      {lines.length ? (
        <ul className={styles.srcList} aria-label={head}>
          {lines.map((l, i) => (
            <li key={`${l.iid ?? 'record'}-${i}`}>
              {l.iid === null ? l.text : <><Mr s={s} iid={l.iid} />: {l.text}</>}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.note}>{empty}</div>
      )}
    </div>
  );
}

/**
 * The outputs behind one count: the MRs it counted, the ones it left out and why, the facts not read. All from `sources`,
 * the same tally the poll totalled the count from (poller/derive/sources.ts); the demo's are illustrative and chipped.
 */
export function RuleSources({ rule, sources, id }: { rule: PromotionRule; sources: RecordSources; id?: string }) {
  const key = countKeyOf(rule.name);
  if (!key) return null;
  const x = explain(key, sources);
  return (
    <div id={id} className={styles.src}>
      {sources.demo ? <Chip compact tone="unknown" title="Illustrative: the demo has no ledger, so these outputs are the demo's own">demo</Chip> : null}
      <Lines head="Counted" lines={x.counted} s={sources} empty={key === 'cleanDays' ? undefined : 'none'} />
      <Lines head="Not counted" lines={x.excluded} s={sources} />
      <Lines head="Not read" lines={x.missing} s={sources} />
      {x.note ? <div className={styles.note}>{x.note}</div> : null}
    </div>
  );
}

/**
 * One row of the promotion rule: name, value, met, and its cells. A row a count backs, with the record's sources, names a
 * button that shows the outputs behind it (aria-expanded; `defaultOpen` for a first render open). `extra`: drawn after
 * the value (a demo chip).
 */
export function RuleRow({ rule: r, sources, extra, defaultOpen = false }: { rule: PromotionRule; sources?: RecordSources | null; extra?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const can = !!sources && countKeyOf(r.name) !== null;
  return (
    <div className={styles.rl}>
      {can ? (
        <button type="button" className={styles.rx} aria-expanded={open} aria-controls={open ? id : undefined} title="The outputs behind this count" onClick={() => setOpen((o) => !o)}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span> {r.name}
        </button>
      ) : (
        <span>{r.name}</span>
      )}
      <span className={styles.v}>
        {r.value}
        {extra}
      </span>
      <span className={r.met ? styles.ok : styles.no} role="img" aria-label={r.met ? 'met' : 'not yet'} title={r.met ? 'met' : 'not yet'}>
        {r.met ? '✓' : '○'}
      </span>
      {r.cells ? (
        <span className={styles.cells} aria-hidden="true">
          {Array.from({ length: r.cells[1] }, (_, i) => (
            <i key={i} className={i < r.cells![0] ? styles.f : undefined} />
          ))}
        </span>
      ) : null}
      {can && open && sources ? <RuleSources rule={r} sources={sources} id={id} /> : null}
    </div>
  );
}
