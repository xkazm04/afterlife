import type { CSSProperties } from 'react';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import type { CiResult } from '@/schemas/vitals';
import { dur, share } from '../../model/format';
import { UNCLASSIFIED } from '../../model/delivery';
import type { RunLine, VariantRow } from '../../model/types';
import styles from '../../vitals.module.css';

const RESULT_TONE: Record<CiResult, ChipTone> = { succeeded: 'ok', failed: 'bad', canceled: 'neutral', partial: 'lag', running: 'pending' };

/** A run's stages as one bar, each stage's width its share of the stage time; an untimed stage is a dashed sliver. */
function StageBar({ run }: { run: RunLine }) {
  const total = run.stages.reduce((a, s) => a + (s.ms ?? 0), 0);
  const name = run.stages.map((s) => `${s.name} ${dur(s.ms)}`).join(', ');
  return (
    <span className={styles.stageBar} role="img" aria-label={name} title={name}>
      {run.stages.map((s, i) => (
        <i
          key={i}
          data-result={s.result}
          data-untimed={s.ms === undefined || undefined}
          style={{ '--w': s.ms !== undefined && total ? `${((s.ms / total) * 100).toFixed(1)}%` : '4px' } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** A picked variant: its figures, per-stage median and p90, and its last runs with a bar of their stages. */
export function VariantInspector({ row }: { row: VariantRow }) {
  return (
    <>
      <InspectorHeader title={row.id} sub={row.id === UNCLASSIFIED ? `Runs no variant rule matched · ${row.pipeline}` : row.pipeline} />
      <InspectorSection title="Figures" aux={`${row.counted} of ${row.runs} counted`}>
        {row.noRuns ? (
          <p className={styles.note}>No run of this variant is stored yet. Its rule is saved; the next collect that sees a matching run fills it.</p>
        ) : (
          <KeyValue
            rows={[
              ['median', dur(row.medianMs)],
              ['p90', dur(row.p90Ms)],
              ['failure rate', share(row.failureRate)],
              ['slowest stage', row.slowestStage ? `${row.slowestStage.name} · ${dur(row.slowestStage.medianMs)}` : null],
            ]}
          />
        )}
        <p className={styles.note}>A run still running, without finishedAt, or canceled is listed below but not counted.</p>
      </InspectorSection>
      {row.stages.length ? (
        <InspectorSection title="Stages" aux="median / p90">
          <table className={styles.mini} aria-label={`${row.id} stages`}>
            <thead>
              <tr><th scope="col">Stage</th><th scope="col">n</th><th scope="col">Median</th><th scope="col">p90</th></tr>
            </thead>
            <tbody>
              {row.stages.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{s.n}</td>
                  <td>{dur(s.medianMs)}</td>
                  <td>{dur(s.p90Ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </InspectorSection>
      ) : null}
      {row.last.length ? (
        <InspectorSection title="Last runs" aux={`${row.last.length} newest`}>
          <table className={styles.mini} aria-label={`${row.id} last runs`}>
            <thead>
              <tr><th scope="col">Run</th><th scope="col">Branch</th><th scope="col">Result</th><th scope="col">Time</th><th scope="col">Stages</th></tr>
            </thead>
            <tbody>
              {row.last.map((r) => (
                <tr key={r.runId}>
                  <th scope="row">{r.runId}</th>
                  <td title={r.branch}>{r.branch}</td>
                  <td><Chip compact tone={RESULT_TONE[r.result]}>{r.result}</Chip></td>
                  <td>{dur(r.durationMs)}</td>
                  <td><StageBar run={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </InspectorSection>
      ) : null}
    </>
  );
}
