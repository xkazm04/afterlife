import type { EstateGroup, EstateProject } from '../../model/estate/estate';
import styles from './estate.module.css';

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));
const ago = (d: number | null): string => (d === null ? '—' : d === 0 ? 'today' : `${d} d ago`);

function Cells({ closed, credited, missed, drift, net }: { closed: number; credited: number; missed: number; drift: number; net: number }) {
  return (
    <>
      <span role="cell" className={styles.num}>{closed}</span>
      <span role="cell" className={styles.num}>{credited}</span>
      <span role="cell" className={styles.num}>{missed}</span>
      <span role="cell" className={styles.num} data-bad={drift > 0 || undefined}>{drift}</span>
      <span role="cell" className={styles.net}>{signed(net)}</span>
    </>
  );
}

function Row({ r, selected, onSelect }: { r: EstateProject; selected: boolean; onSelect: (id: string) => void }) {
  const ok = r.drift.length === 0 && r.breaks === 0;
  return (
    <div role="row" className={styles.row} data-selected={selected || undefined} onClick={() => onSelect(r.id)}>
      <span role="cell" className={styles.name}>
        <i className={styles.proof} data-ok={ok || undefined} title={ok ? 'Replay: unwound to day 0 and replayed, the history lands on today’s rungs' : `Replay: off on ${r.drift.join(', ') || 'the chain'}`}>
          {ok ? '✓' : '✗'}
        </i>
        <button type="button" aria-pressed={selected} onClick={(e) => (e.stopPropagation(), onSelect(r.id))}>{r.name}</button>
        <span>last close {ago(r.sinceClose)}</span>
      </span>
      <Cells closed={r.closed} credited={r.sum.credited} missed={r.sum.missed} drift={r.sum.regressed} net={r.sum.net} />
      <span role="cell" className={styles.num} title={r.unknown ? `${r.unknown} stage(s) unknown: not counted` : undefined}>
        {r.held}{r.unknown ? <i>+?</i> : null}
      </span>
    </div>
  );
}

/** Every group of the estate, with its projects in cycles; a group none of whose projects cycles says so. */
export function EstateTable({ groups, selected, onSelect }: { groups: readonly EstateGroup[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className={styles.t} role="table" aria-label="Projects in cycles, per group" data-scroll-x>
      <div role="row" className={`${styles.row} ${styles.head}`}>
        {['Project', 'Cycles', 'Credited', 'Not earned', 'Drift', 'Net', 'Held'].map((h) => (
          <span key={h} role="columnheader">{h}</span>
        ))}
      </div>
      {groups.map((g) => (
        <div key={g.group} role="rowgroup" className={styles.sec}>
          <div role="row" className={`${styles.row} ${styles.group}`}>
            <span role="rowheader" className={styles.name}>
              <b>{g.group}</b>
              <span title={`${g.projects.length} of ${g.watching} watching projects are in cycles`}>{g.projects.length} of {g.watching} watching</span>
            </span>
            {g.projects.length ? <Cells closed={g.closed} credited={g.sum.credited} missed={g.sum.missed} drift={g.sum.regressed} net={g.sum.net} /> : <span role="cell" className={styles.none}>no project in cycles yet</span>}
          </div>
          {g.projects.map((r) => <Row key={r.id} r={r} selected={selected === r.id} onSelect={onSelect} />)}
        </div>
      ))}
    </div>
  );
}
