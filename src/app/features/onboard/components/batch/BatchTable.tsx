import { Button } from '@/components/controls/Button';
import type { FleetProject } from '@/lib/demo/types';
import { nextAction, type Batch, type ProjectRun } from '../../model/batch';
import { STEP_WORD, type Step } from '../../model/funnel';
import styles from './batch.module.css';

interface Props {
  batch: Batch;
  runs: Readonly<Record<string, ProjectRun>>;
  byId: ReadonlyMap<string, FleetProject>;
  org: string;
  filter: Step | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onResolve: (id: string) => void;
}

const SECTIONS = [
  { key: 'yours', title: 'Only you', aux: 'merges and tokens: Afterlife never does these' },
  { key: 'reads', title: 'Reads', aux: 'every one runs: they write nothing' },
  { key: 'writes', title: 'Writes', aux: 'one MR each, as you, then a person merges' },
] as const;

/**
 * The next batch, in three parts: what only you can do, the reads (all of them), and the writes (capped by the batch
 * size). A row names the project, where it stands, the one next action and who does it. The step filter narrows it.
 */
export function BatchTable(p: Props) {
  return (
    <div className={styles.t} role="table" aria-label="Next batch">
      {SECTIONS.map((sec) => {
        const ids = p.batch[sec.key].filter((id) => !p.filter || p.runs[id]?.step === p.filter);
        return (
          <div key={sec.key} role="rowgroup" className={styles.sec}>
            <div role="row" className={styles.sh}>
              <span role="columnheader">
                <b>{sec.title}</b> {ids.length} <span className={styles.aux}>· {sec.aux}</span>
              </span>
            </div>
            {ids.length === 0 ? (
              <div role="row" className={styles.none}>
                <span role="cell">{p.filter ? `Nothing ${STEP_WORD[p.filter].toLowerCase()} here.` : 'Nothing here.'}</span>
              </div>
            ) : null}
            {ids.map((id) => {
              const proj = p.byId.get(id);
              const run = p.runs[id];
              const a = proj && run ? nextAction(proj, run, p.org) : null;
              if (!proj || !run || !a) return null;
              return (
                <div key={id} role="row" className={styles.row} aria-selected={p.selected === id} onClick={() => p.onSelect(id)}>
                  <span role="cell" className={styles.name}>
                    <button type="button" onClick={(e) => (e.stopPropagation(), p.onSelect(id))}>
                      {proj.name}
                    </button>
                    <span>{proj.group}</span>
                  </span>
                  <span role="cell" className={styles.step} data-step={run.step}>
                    {STEP_WORD[run.step]}
                  </span>
                  <span role="cell" className={styles.act}>
                    {a.label}
                  </span>
                  <span role="cell" className={styles.who} data-who={a.who}>
                    {a.who === 'you' ? (a.writes ? 'as you' : 'you') : 'Afterlife'}
                  </span>
                  <span role="cell" className={styles.end}>
                    {sec.key === 'yours' ? (
                      <Button size="mini" onClick={(e) => (e.stopPropagation(), p.onResolve(id))} title="Simulated: the probe finds it done">
                        {a.kind === 'merge' ? 'Merged · re-probe' : 'Renewed · re-probe'}
                      </Button>
                    ) : (
                      `${a.writes ? `${a.writes} MR` : 'read'}`
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
