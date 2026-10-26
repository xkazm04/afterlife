'use client';

// Setup before its catalogue is read (the screen host's first slice): the same boxes the read screen draws - the
// toolbar, the summary strip, the map's three column heads, a node page's heading - with a dash for every value, so
// nothing moves when it lands. Never a zero and never amber: nothing is known to wait for you yet. No skeleton bars.
import { Spacer } from '@/components/controls/Spacer';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Icon } from '@/components/icons/Icon';
import { Unread } from '@/components/shell/host';
import { ColumnHead } from '../map/columns/ColumnHead';
import cols from '../map/columns/columns.module.css';
import map from '../map/UnlockMap.module.css';
import strip from '../summary/SetupSummary.module.css';
import bar from '../toolbar/SetupToolbar.module.css';
import { UnreadStats } from './UnreadStats';

const WORDS = ['available', 'unavailable', 'unknown'] as const;

export function ToolbarPending() {
  return (
    <>
      <PopupButton icon="folder" title="GitLab group" disabled>
        <Unread label="group not read yet" />
      </PopupButton>
      <Spacer />
      <Lozenge label="afterlife doctor">
        {WORDS.map((w, i) => (
          <span key={w} className={bar.cell}>
            {i > 0 ? <LozengeDivider /> : null}
            <LozengeButton count={<Unread label={`${w}: not read yet`} />} word={w} title="afterlife doctor not read yet" />
          </span>
        ))}
      </Lozenge>
      <Spacer />
      <ToolbarButton className={bar.probe} disabled title="Re-probe the group with afterlife doctor">
        <Icon name="probe" />
        <span>Re-probe</span>
      </ToolbarButton>
    </>
  );
}

export function SummaryPending() {
  return (
    <section className={strip.strip} aria-label="Where you stand" aria-busy="true">
      <div className={strip.panel}>
        <div className={strip.top}>
          <UnreadStats cells={['armed', 'ready', 'locked', 'need you'].map((label) => ({ n: null, label }))} />
          <span className={strip.note}>
            <Unread label="group not read yet" /> / <Unread label="project not read yet" /> · <Unread /> of <Unread /> steps read done
          </span>
        </div>
        <div className={strip.gates} aria-label="Only you can do these" />
      </div>
    </section>
  );
}

/** The map's canvas and column heads; `reason`: the catalogue could not be read, and why. */
export function MapPending({ reason }: { reason?: string }) {
  return (
    <section className={map.map} aria-label="Unlock map" aria-busy={reason ? undefined : true}>
      <div className={map.cols}>
        <div className={cols.col}>
          <ColumnHead name="Path" sub="steps 0–14" aux={<Unread label="steps not read yet" />} />
          {reason ? <div className={cols.empty} role="status">Setup could not be read: {reason}</div> : null}
        </div>
        <div />
        <div className={`${cols.col} ${cols.tracks}`}>
          <ColumnHead name="Tracks" sub="arm order" aux={<Unread label="tracks not read yet" />} />
        </div>
        <div />
        <div className={`${cols.col} ${cols.caps}`}>
          <ColumnHead name="GitLab" sub="afterlife doctor" aux={<Unread label="afterlife doctor not read yet" />} />
        </div>
      </div>
    </section>
  );
}

export function StatusPending() {
  return (
    <>
      <Unread />/<Unread /> steps read done · <Unread />/<Unread /> armed · <Unread label="need you not read yet" /> need you · afterlife doctor · not read yet
    </>
  );
}
