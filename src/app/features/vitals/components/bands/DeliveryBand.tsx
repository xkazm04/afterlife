'use client';

import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { px, range } from '@/components/table/model/columns';
import { TrendStrip } from '@/components/viz/trend/TrendStrip';
import { dur, share } from '../../model/format';
import { TREND_RUNS, UNCLASSIFIED } from '../../model/delivery';
import type { VariantRow } from '../../model/types';
import { BandTable, type BandColumn } from '../BandTable';
import { Band, BandEmpty } from './Band';

const COLUMNS = [range(150, 220), range(140, 220), px(70), px(80), px(80), px(70), range(150, 220), px(130)].join(' ');
const HEAD: readonly BandColumn[] = [
  { head: 'Variant' },
  { head: 'Pipeline' },
  { head: 'Runs', align: 'end', tip: 'Runs counted (finished, not canceled) of runs stored' },
  { head: 'Median', align: 'end', tip: 'Median run duration, finishedAt - startedAt' },
  { head: 'p90', align: 'end', tip: '90th percentile run duration (nearest rank)' },
  { head: 'Fail', align: 'end', tip: 'failed / (succeeded + failed + partial)' },
  { head: 'Slowest stage', tip: 'The stage with the highest median' },
  { head: 'Trend', tip: `The last ${TREND_RUNS} counted run durations, oldest left` },
];

export const variantId = (id: string): string => `v:${id}`;

/** Delivery: one row per variant, how long it takes and how often it fails. A variant with no run yet says so. */
export function DeliveryBand({ rows, selected, onSelect, onActivate }: { rows: readonly VariantRow[]; selected: string | null; onSelect: (id: string) => void; onActivate: (id: string) => void }) {
  const runs = rows.reduce((a, r) => a + r.runs, 0);
  return (
    <Band id="delivery" title="Delivery" aux={`${rows.length} variant${rows.length === 1 ? '' : 's'} · ${runs} run${runs === 1 ? '' : 's'}`}>
      {rows.length === 0 ? (
        <BandEmpty>No CI pipeline is saved for this project. Onboard it again to add its pipelines and variants.</BandEmpty>
      ) : (
        <BandTable
          label="Delivery by variant"
          columns={COLUMNS}
          min={940}
          head={HEAD}
          selected={selected}
          onSelect={onSelect}
          onActivate={onActivate}
          rows={rows.map((r) => ({
            id: variantId(r.id),
            muted: r.noRuns,
            title: r.id === UNCLASSIFIED ? 'Runs no variant rule matched' : r.id,
            cells: [
              r.id,
              r.pipeline,
              r.noRuns ? <HonestyChip kind="unknown" meaning="No run of this variant is stored yet">no runs</HonestyChip> : `${r.counted} / ${r.runs}`,
              dur(r.medianMs),
              dur(r.p90Ms),
              share(r.failureRate),
              r.slowestStage ? `${r.slowestStage.name} · ${dur(r.slowestStage.medianMs)}` : '-',
              <TrendStrip key="t" values={r.trend} label={`${r.id} run minutes`} days={TREND_RUNS} unit={['run', 'runs']} />,
            ],
          }))}
        />
      )}
    </Band>
  );
}
