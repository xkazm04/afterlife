'use client';

import Link from 'next/link';
import type { CloudConfig } from '@/schemas/vitals';
import { px, range } from '@/components/table/model/columns';
import { signalValue } from '../../model/format';
import type { SignalRow } from '../../model/types';
import { BandTable, type BandColumn } from '../BandTable';
import { Band, BandEmpty } from './Band';
import { MarkedTrend } from './MarkedTrend';

const COLUMNS = [range(140, 200), px(110), px(110), px(140), range(160, 240)].join(' ');
const HEAD: readonly BandColumn[] = [
  { head: 'Signal' },
  { head: 'Last 24 h', align: 'end', tip: 'Counts add up; rates and p95 are the mean of the hourly bins weighted by their sample' },
  { head: 'Sample', align: 'end', tip: 'Requests (or availability tests) behind the last 24 h figure' },
  { head: '7 d trend', tip: '28 cells of 6 h, oldest left; a tick is a deploy seen in CI' },
  { head: 'Deploys', tip: 'Deploy stages that succeeded in the last 7 days' },
];

export const signalId = (s: string): string => `s:${s}`;

/** Production: one row per App Insights signal. No cloud connected: what to do, never an empty table of zeros. */
export function ProductionBand({ rows, cloud, selected, onSelect, onActivate }: {
  rows: readonly SignalRow[] | undefined;
  cloud: CloudConfig;
  selected: string | null;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  if (!rows) {
    return (
      <Band id="production" title="Production" aux="not connected">
        <BandEmpty>
          No cloud telemetry is connected for this project, so Afterlife has no production signal to show. <Link href="/start">Connect App Insights in Set up ›</Link>
        </BandEmpty>
      </Band>
    );
  }
  const any = rows.some((r) => r.trend.some((v) => v !== null));
  const deploys = rows[0]?.markers ?? [];
  return (
    <Band id="production" title="Production" aux={cloud.resource ? `${cloud.provider} · ${cloud.resource.name}` : cloud.provider}>
      {!any ? <BandEmpty>No production point is stored yet for the last 7 days. Refresh collects them.</BandEmpty> : null}
      <BandTable
        label="Production signals"
        columns={COLUMNS}
        min={700}
        head={HEAD}
        selected={selected}
        onSelect={onSelect}
        onActivate={onActivate}
        rows={rows.map((r) => ({
          id: signalId(r.signal),
          muted: r.last24 === undefined,
          cells: [
            r.label,
            signalValue(r.signal, r.last24),
            r.last24 === undefined ? '-' : r.n24.toLocaleString('en-US'),
            <MarkedTrend key="t" values={r.trend} label={r.label} markers={r.markers} />,
            deploys.length ? deploys.map((m) => m.runId).join(', ') : 'none in 7 d',
          ],
        }))}
      />
    </Band>
  );
}
