import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { signalValue } from '../../model/format';
import type { SignalRow } from '../../model/types';
import styles from '../../vitals.module.css';
import { MarkedTrend } from '../bands/MarkedTrend';

const HOW: Record<SignalRow['signal'], string> = {
  requests: 'The requests App Insights recorded, added up over the window.',
  'failed-rate': 'The share of requests that failed (a 0..1 fraction, drawn as a percent): the hourly rates weighted by each hour’s requests.',
  'p95-ms': 'The 95th percentile request duration: the hourly p95s weighted by each hour’s requests.',
  exceptions: 'The exceptions App Insights recorded, added up over the window.',
  availability: 'The share of availability tests that passed, in percent, weighted by each hour’s tests.',
};

/** A picked production signal: the last 24 h figure, how it is built, the trend and the deploys on it. */
export function SignalInspector({ row }: { row: SignalRow }) {
  return (
    <>
      <InspectorHeader title={row.label} sub="App Insights, 60-minute bins" />
      <InspectorSection title="Last 24 h">
        <KeyValue rows={[['value', row.last24 === undefined ? null : signalValue(row.signal, row.last24)], ['sample', row.last24 === undefined ? null : row.n24.toLocaleString('en-US')]]} />
        <p className={styles.note}>{HOW[row.signal]}</p>
      </InspectorSection>
      <InspectorSection title="7 days" aux={`${row.markers.length} deploy${row.markers.length === 1 ? '' : 's'}`}>
        <MarkedTrend values={row.trend} label={row.label} markers={row.markers} />
        {row.markers.length ? (
          <ul className={styles.list}>
            {row.markers.map((m) => (
              <li key={`${m.runId}:${m.stage}`}>
                run {m.runId} · {m.stage} · {m.at}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>No deploy stage succeeded in CI in these 7 days.</p>
        )}
      </InspectorSection>
    </>
  );
}
