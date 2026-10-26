'use client';

// The Maturity screens' regions before the data is read (the screen host's core slice): the same boxes the read screens
// draw, so nothing moves when it lands. The stage names are static (the schema's nine stages); every rung, count and
// note is an em dash, never a zero and never "unknown" (unknown is a reading; this is no reading yet).
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';
import { Unread } from '@/components/shell/host';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { STAGES } from '@/schemas/stages';
import { stagePath } from '../../hooks/useStepNav';
import { capitalize } from '../../model/rungs';
import inspector from '../inspector/inspector.module.css';

/** The sidebar's nine stages, names only: each rung a dash (no meter: a "?" meter would read as unknown). */
export function StageListPending({ selected }: { selected?: string }) {
  return (
    <SidebarSection title="Stages">
      <div data-stagelist="" role="group" aria-label="Stages" aria-busy="true">
        {STAGES.map((s) => (
          <SidebarItem key={s} label={capitalize(s)} count={<Unread label={`${s} rung not read yet`} />} current={selected === s} href={stagePath(s)} />
        ))}
      </div>
    </SidebarSection>
  );
}

/** The status line before the read. */
export function StatusPending() {
  return (
    <>
      9 stages · <Unread /> deep · <Unread /> touched · <Unread /> absent · <Unread label="unknown not read yet" /> unknown
    </>
  );
}

/** A stage page's cards before the read: the same four cards, each a dash. */
export function StagePending({ reason }: { reason?: string }) {
  const body = reason ? <div className={inspector.muted}>Maturity could not be read: {reason}</div> : <Unread label="not read yet" />;
  return (
    <>
      {['Evidence', 'Gap', 'Day 0', 'Credit history'].map((t) => (
        <DetailSection key={t} title={t} aux={<Unread />}>
          <div className={inspector.muted}>{body}</div>
        </DetailSection>
      ))}
    </>
  );
}

/** The crag could not be read: why (a fixed reason from the server). */
export function CoreUnreadable({ reason }: { reason: string }) {
  return (
    <div role="status" className={inspector.muted}>
      Maturity could not be read: {reason}
    </div>
  );
}

/** An unknown /maturity/<stage>: it is the stage that is missing (not a page), with the way back to the crag. */
export function StageNotFound() {
  return (
    <EntityNotFound
      title="Stage not found"
      note="The crag has no stage with that name. The nine stages are the DevSecOps stages the scan reads."
      href="/maturity"
      back="Back to Maturity"
    />
  );
}
