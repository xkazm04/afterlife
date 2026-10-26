'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { Reveal, Unread } from '@/components/shell/host';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { AdjustmentsBand } from './components/bands/AdjustmentsBand';
import { BandPending } from './components/bands/Band';
import { DeliveryBand, variantId } from './components/bands/DeliveryBand';
import { ProductionBand } from './components/bands/ProductionBand';
import { VitalsInspector } from './components/inspector/VitalsInspector';
import { CollectNotice } from './components/states/CollectNotice';
import { DemoLabel, DemoNotice } from './components/states/DemoNote';
import { Unreadable } from './components/states/Unreadable';
import { QueueSheet } from './components/write/QueueSheet';
import { useCollect } from './hooks/useCollect';
import { agoWords } from './model/format';
import type { Pending, VitalsPending } from './model/slices';
import type { AdjustmentRow, VitalsView } from './model/types';
import styles from './vitals.module.css';

export interface VitalsBodyProps {
  view: VitalsView;
  /** The parts not read yet (true) or not readable (why), each drawn as a dash; absent: the whole view is read. */
  pending?: VitalsPending;
  /** The Refresh click is on its way to the server. */
  starting?: boolean;
  /** Why the server would not start a collect. */
  refused?: string;
  onRefresh: () => void;
}

const reasonOf = (p: Pending | undefined): string | undefined => (typeof p === 'string' ? p : undefined);

/** The project's window, its collect state given: what VitalsScreen draws, and what the tests render state by state. */
export function VitalsBody({ view, pending = {}, starting = false, refused, onRefresh }: VitalsBodyProps) {
  const first = view.delivery[0];
  // the default pick is the first variant once the CI part is read; a person's own pick is never overridden
  const [own, setPicked] = useState<string | null>(null);
  const picked = own ?? (first ? variantId(first.id) : null);
  const [open, setOpen] = useState(true);
  const [queueing, setQueueing] = useState<AdjustmentRow | null>(null);
  const activate = (id: string) => {
    setPicked(id);
    setOpen(true);
  };
  // a demo project has nothing to collect: Refresh stays off
  const busy = !!view.demo || starting || (!!view.job && !view.job.done) || !!pending.job || !!pending.config;
  const collecting = view.job && !view.job.done;
  const collected = pending.ci || pending.config ? (
    <>
      last collected <Unread label="last collect not read yet" />
    </>
  ) : collecting ? (
    `collecting, started ${agoWords(view.job?.startedAt, view.now)}`
  ) : (
    `last collected ${agoWords(view.lastCollected, view.now)}`
  );
  const counts = pending.ci ? (
    <>
      <Unread label="variants not read yet" /> variants · <Unread label="runs not read yet" /> runs stored
    </>
  ) : (
    `${view.delivery.length} variant${view.delivery.length === 1 ? '' : 's'} · ${view.runsStored} run${view.runsStored === 1 ? '' : 's'} stored`
  );
  const unreadable = reasonOf(pending.config) ?? reasonOf(pending.ci);
  return (
    <Window
      title="Vitals"
      subtitle={pending.config ? view.slug : view.name}
      toolbar={
        <>
          <Link href="/vitals" className={styles.back}>
            ‹ All projects
          </Link>
          <Spacer />
          <span className={styles.collected} data-xray="collected">{collected}</span>
          <Button size="mini" onClick={onRefresh} disabled={busy} title={view.demo ? 'A demo project: nothing to collect' : 'Collect CI runs and production points since the newest stored'}>
            Refresh
          </Button>
        </>
      }
      inspector={
        <Reveal order={4} slice="ci">
          <VitalsInspector view={view} picked={picked} onQueue={setQueueing} />
        </Reveal>
      }
      inspectorOpen={open}
      onInspectorOpenChange={setOpen}
      realData={!view.demo}
      status={
        <>
          {view.demo ? <DemoLabel realData={false} /> : null}
          {counts} · {collected} · {pending.config ? <Unread label="root not read yet" /> : view.root}
        </>
      }
    >
      <PaneScroll>
        <div className={styles.bands}>
          {unreadable ? <Unreadable what="This project's vitals" reason={unreadable} /> : null}
          {view.demo ? <DemoNotice name={view.name} /> : null}
          {pending.config || pending.job || view.demo ? null : <CollectNotice job={view.job} refused={refused} starting={starting} now={view.now} />}
          <Reveal order={1} slice="ci">
            {pending.ci ? <BandPending id="delivery" title="Delivery" reason={reasonOf(pending.ci)} /> : <DeliveryBand rows={view.delivery} selected={picked} onSelect={setPicked} onActivate={activate} />}
          </Reveal>
          <Reveal order={2} slice="prod">
            {pending.prod || pending.config ? (
              <BandPending id="production" title="Production" reason={reasonOf(pending.prod)} />
            ) : (
              <ProductionBand rows={view.production} cloud={view.cloud} selected={picked} onSelect={setPicked} onActivate={activate} />
            )}
          </Reveal>
          <Reveal order={3} slice="adjustments">
            {pending.adjustments ? (
              <BandPending id="adjustments" title="Adjustments" reason={reasonOf(pending.adjustments)} />
            ) : (
              <AdjustmentsBand rows={view.adjustments} selected={picked} onSelect={setPicked} onActivate={activate} />
            )}
          </Reveal>
        </div>
      </PaneScroll>
      {queueing ? <QueueSheet slug={view.slug} row={queueing} onClose={() => setQueueing(null)} /> : null}
    </Window>
  );
}

/**
 * /vitals/[project]: one real project's Delivery (CI by variant), Production (App Insights signals with deploys) and
 * Adjustments (claims beside Afterlife's measurements). A picked row opens in the inspector. Read-only, except
 * Refresh, which collects through the person's own az / glab login, and an adjustment's re-measures (Queue N runs is
 * a write as the person: its sheet shows the server's exact commands first). The screen host draws it from five slices
 * (screen/host.tsx); `pending` marks the parts not read yet. A demo estate project (`view.demo`) draws the same bands
 * from illustrative figures, says so, and offers neither Refresh nor a re-measure.
 */
export function VitalsScreen({ view, pending = {} }: { view: VitalsView; pending?: VitalsPending }) {
  // a demo project never collects on open: nothing behind it to collect from
  const c = useCollect(view, !pending.config && !pending.ci && !pending.job && !view.demo);
  return <VitalsBody view={view} pending={pending} starting={c.starting} refused={c.refused} onRefresh={c.refresh} />;
}
