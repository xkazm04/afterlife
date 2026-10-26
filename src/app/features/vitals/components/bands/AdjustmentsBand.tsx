'use client';

import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import { px, range } from '@/components/table/model/columns';
import { measuredPct, targetWords } from '../../model/adjustments';
import { signedPct } from '../../model/format';
import type { AdjustmentRow, AdjustmentState } from '../../model/types';
import { BandTable, type BandColumn } from '../BandTable';
import { Band, BandEmpty } from './Band';

export const STATE_TONE: Record<AdjustmentState, ChipTone> = {
  proposed: 'neutral',
  measuring: 'pending',
  credited: 'ok',
  'not-earned': 'bad',
  inconclusive: 'unknown',
};

const COLUMNS = [range(200, 320), range(170, 260), px(110), px(110), px(120), px(90)].join(' ');
const HEAD: readonly BandColumn[] = [
  { head: 'Adjustment' },
  { head: 'Target' },
  { head: 'State', tip: 'From Afterlife’s latest measurement only: the claim never decides' },
  { head: 'Agent’s claim', align: 'end', tip: 'What the agent or person said it would move: shown, never used in the verdict' },
  { head: 'Measured', align: 'end', tip: 'Afterlife’s measurement: head median against base median' },
  { head: 'n', align: 'end', tip: 'Samples, base / head' },
];

export const adjustmentId = (id: string): string => `a:${id}`;

const claimWords = (r: AdjustmentRow): string => {
  const c = r.claim;
  if (c.expectedPct !== undefined) return `${c.direction === 'down' ? '-' : '+'}${c.expectedPct}%`;
  return c.agentValue !== undefined ? String(c.agentValue) : '-';
};

/** Adjustments: claims beside Afterlife's own measurements. A claim with no measurement is proposed, never credited. */
export function AdjustmentsBand({ rows, selected, onSelect, onActivate }: { rows: readonly AdjustmentRow[]; selected: string | null; onSelect: (id: string) => void; onActivate: (id: string) => void }) {
  const credited = rows.filter((r) => r.state === 'credited').length;
  return (
    <Band id="adjustments" title="Adjustments" aux={rows.length ? `${rows.length} claimed · ${credited} credited` : 'none yet'}>
      {rows.length === 0 ? (
        <BandEmpty>
          No adjustment reported yet. A dev agent reports one with <code>afterlife report</code> (the afterlife-report skill); Afterlife then measures it itself.
        </BandEmpty>
      ) : (
        <BandTable
          label="Adjustments"
          columns={COLUMNS}
          min={820}
          head={HEAD}
          selected={selected}
          onSelect={onSelect}
          onActivate={onActivate}
          rows={rows.map((r) => ({
            id: adjustmentId(r.claim.id),
            title: r.claim.title,
            cells: [
              r.claim.title,
              targetWords(r.claim.target),
              <Chip key="s" compact tone={STATE_TONE[r.state]}>{r.state}</Chip>,
              claimWords(r),
              r.measurement ? signedPct(measuredPct(r.measurement)) : '-',
              r.measurement ? `${r.measurement.base.n} / ${r.measurement.head.n}` : '-',
            ],
          }))}
        />
      )}
    </Band>
  );
}
