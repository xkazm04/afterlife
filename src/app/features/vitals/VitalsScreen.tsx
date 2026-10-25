'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { AdjustmentsBand } from './components/bands/AdjustmentsBand';
import { DeliveryBand, variantId } from './components/bands/DeliveryBand';
import { ProductionBand } from './components/bands/ProductionBand';
import { VitalsInspector } from './components/inspector/VitalsInspector';
import { CollectNotice } from './components/states/CollectNotice';
import { QueueSheet } from './components/write/QueueSheet';
import { useCollect } from './hooks/useCollect';
import { agoWords } from './model/format';
import type { AdjustmentRow, VitalsView } from './model/types';
import styles from './vitals.module.css';

export interface VitalsBodyProps {
  view: VitalsView;
  /** The Refresh click is on its way to the server. */
  starting?: boolean;
  /** Why the server would not start a collect. */
  refused?: string;
  onRefresh: () => void;
}

/** The project's window, its collect state given: what VitalsScreen draws, and what the tests render state by state. */
export function VitalsBody({ view, starting = false, refused, onRefresh }: VitalsBodyProps) {
  const first = view.delivery[0];
  const [picked, setPicked] = useState<string | null>(first ? variantId(first.id) : null);
  const [open, setOpen] = useState(true);
  const [queueing, setQueueing] = useState<AdjustmentRow | null>(null);
  const activate = (id: string) => {
    setPicked(id);
    setOpen(true);
  };
  const busy = starting || (!!view.job && !view.job.done);
  const collected = view.job && !view.job.done ? `collecting, started ${agoWords(view.job.startedAt, view.now)}` : `last collected ${agoWords(view.lastCollected, view.now)}`;
  return (
    <Window
      title="Vitals"
      subtitle={view.name}
      toolbar={
        <>
          <Link href="/vitals" className={styles.back}>
            ‹ All projects
          </Link>
          <Spacer />
          <span className={styles.collected} data-xray="collected">{collected}</span>
          <Button size="mini" onClick={onRefresh} disabled={busy} title="Collect CI runs and production points since the newest stored">
            Refresh
          </Button>
        </>
      }
      inspector={<VitalsInspector view={view} picked={picked} onQueue={setQueueing} />}
      inspectorOpen={open}
      onInspectorOpenChange={setOpen}
      status={`${view.delivery.length} variant${view.delivery.length === 1 ? '' : 's'} · ${view.runsStored} run${view.runsStored === 1 ? '' : 's'} stored · ${collected} · ${view.root}`}
    >
      <PaneScroll>
        <div className={styles.bands}>
          <CollectNotice job={view.job} refused={refused} starting={starting} now={view.now} />
          <DeliveryBand rows={view.delivery} selected={picked} onSelect={setPicked} onActivate={activate} />
          <ProductionBand rows={view.production} cloud={view.cloud} selected={picked} onSelect={setPicked} onActivate={activate} />
          <AdjustmentsBand rows={view.adjustments} selected={picked} onSelect={setPicked} onActivate={activate} />
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
 * a write as the person: its sheet shows the server's exact commands first).
 */
export function VitalsScreen({ view }: { view: VitalsView }) {
  const c = useCollect(view);
  return <VitalsBody view={view} starting={c.starting} refused={c.refused} onRefresh={c.refresh} />;
}
