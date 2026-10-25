'use client';

// One sample screen drawn from its last-known props, exactly as its page draws it (or the page's own skeleton before the
// first read). Needs you's desk gets its own store here: the copy only covers the wait, the route's layout store takes over.
import type { ScreenProps } from '@/app/features/shell-arms/data/screenProps';
import { FleetScreen } from '@/app/features/fleet/FleetScreen';
import { MonitorScreen } from '@/app/features/monitor/MonitorScreen';
import { NeedsStore } from '@/app/features/needs-you/hooks/NeedsStore';
import { NeedsYouEmpty } from '@/app/features/needs-you/NeedsYouEmpty';
import { NeedsYouLive } from '@/app/features/needs-you/NeedsYouLive';
import { NeedsYouScreen } from '@/app/features/needs-you/NeedsYouScreen';
import { ScreenSkeleton, type SkeletonLayout } from '@/components/shell/loading/ScreenSkeleton';
import type { ArmScreenKey } from '../navArm';
import type { Entry } from './registry';
import styles from './registry.module.css';

/** Each screen's own route skeleton (fleet/page.tsx, monitor/loading.tsx, needs-you/loading.tsx). */
const SKELETON: Record<ArmScreenKey, { title: string; layout: SkeletonLayout }> = {
  fleet: { title: 'Belay', layout: 'table' },
  monitor: { title: 'Monitor', layout: 'lanes' },
  'needs-you': { title: 'Needs you', layout: 'table' },
};

function NeedsCopy({ view, runner }: ScreenProps['needs-you']) {
  if (view.kind === 'desk') {
    return (
      <NeedsStore demo={view.demo}>
        <NeedsYouScreen demo={view.demo} runner={runner} />
      </NeedsStore>
    );
  }
  if (view.kind === 'live') {
    return <NeedsYouLive items={view.items} seeded={view.seeded} project={view.project} evidence={view.evidence} decided={view.decided} now={view.now} runner={runner} />;
  }
  return <NeedsYouEmpty seeded={view.seeded} demo={view.demo} runner={runner} />;
}

function Screen({ k, props }: { k: ArmScreenKey; props: ScreenProps[ArmScreenKey] }) {
  if (k === 'fleet') return <FleetScreen {...(props as ScreenProps['fleet'])} />;
  if (k === 'monitor') return <MonitorScreen {...(props as ScreenProps['monitor'])} />;
  return <NeedsCopy {...(props as ScreenProps['needs-you'])} />;
}

const clock = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');

/** `note`: the copy's props may be stale (Needs you only); it says so over the screen until the fresh read lands. */
export function ScreenCopy({ k, entry, note }: { k: ArmScreenKey; entry: Entry; note: 'updating' | 'failed' | null }) {
  const sk = SKELETON[k];
  return (
    <div className={styles.contents} data-arm-c-copy={k} aria-busy={note === 'updating' || undefined}>
      {entry.props ? <Screen k={k} props={entry.props} /> : <ScreenSkeleton title={sk.title} layout={sk.layout} />}
      {note ? (
        <>
          <span className={styles.scrim} aria-hidden />
          <span className={styles.note} role="status">
            {note === 'updating' ? `Updating · shown as of ${clock(entry.asOf)}` : `Not refreshed · shown as of ${clock(entry.asOf)}`}
          </span>
        </>
      ) : null}
    </div>
  );
}
