// The Cycles regions before the screen stream's core slice lands: the same boxes the read screen draws, with an em dash
// for every value (never a zero: an unread count is unknown). The grid's stage rows and its Rungs row are static, so
// they paint at once; only the cycle columns wait for the data.
import type { CSSProperties } from 'react';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { Unread } from '@/components/shell/host';
import { px } from '@/components/table/model/columns';
import { STAGES } from '@/schemas/stages';
import answer from '../answer/answer.module.css';
import grid from '../grid/grid.module.css';
import cycles from '../../cycles.module.css';

/** The answer band: the big number, its three facts and the proofs' place, each a dash. */
export function AnswerPending({ label = 'Where the cycles stand', unit = 'of — rungs' }: { label?: string; unit?: string }) {
  return (
    <section className={answer.band} aria-label={label} aria-busy="true">
      <div className={answer.big}>
        <b data-unread>
          <Unread label="rungs not read yet" />
        </b>
        <span>
          {unit}
          <em>
            <Unread /> · <Unread />
          </em>
        </span>
      </div>
      <dl className={answer.facts}>
        {['credited', 'not earned', 'drift caught'].map((w) => (
          <div key={w}>
            <dt>{w}</dt>
            <dd>
              <Unread label={`${w}: not read yet`} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The grid: every stage's row head and the Rungs row, one column of dashes where the cycles will stand. */
export function GridPending() {
  const style = { '--n': 1, '--lw': px(92) } as CSSProperties;
  return (
    <div className={grid.grid} style={style} role="table" aria-label="Rung per stage after every cycle" aria-busy="true">
      <div className={grid.row} role="row">
        <span className={grid.corner} role="columnheader">
          Stage
        </span>
        <span role="columnheader" className={grid.chc}>
          <span className={grid.ch}>
            <b>
              <Unread label="cycles not read yet" />
            </b>
          </span>
        </span>
      </div>
      {[...STAGES, 'Rungs'].map((s) => (
        <div key={s} className={grid.row} role="row">
          <span className={grid.stage} role="rowheader">
            {s}
          </span>
          <span role="cell" className={grid.cell}>
            <Unread label={`${s}: not read yet`} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** The selected cycle's section: its heading's place, nothing claimed. */
export function DetailPending() {
  return (
    <section className={cycles.detail} aria-label="Cycle detail" aria-busy="true">
      <header className={cycles.dh}>
        <h2>
          <Unread label="cycle not read yet" />
        </h2>
      </header>
    </section>
  );
}

export function InspectorPending({ what = 'Reading the cycles' }: { what?: string }) {
  return <InspectorHeader title={<Unread label="cycle not read yet" />} sub={what} />;
}

export function StatusPending() {
  return (
    <>
      <Unread /> cycles closed · <Unread /> running · scan <Unread /> · engine <Unread />
    </>
  );
}

/** The core slice could not be read: why, in the pane (a fixed reason from the server). */
export function CoreUnreadable({ reason }: { reason: string }) {
  return (
    <p className={cycles.detail} role="status">
      The cycles could not be read: {reason}
    </p>
  );
}
