'use client';

// One sample screen as its page draws it, from the envelope's props: the same components, unchanged, with the same
// props (fleet/FleetList.tsx, monitor/page.tsx, needs-you/page.tsx + layout.tsx's NeedsStore). Before the first read
// lands, the route's own skeleton.
import { FleetScreen } from '@/app/features/fleet/FleetScreen';
import { MonitorScreen } from '@/app/features/monitor/MonitorScreen';
import { NeedsStore } from '@/app/features/needs-you/hooks/NeedsStore';
import { NeedsYouEmpty } from '@/app/features/needs-you/NeedsYouEmpty';
import { NeedsYouLive } from '@/app/features/needs-you/NeedsYouLive';
import { NeedsYouScreen } from '@/app/features/needs-you/NeedsYouScreen';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import type { ScreenEnvelope } from '../screenApi';
import type { ArmScreenKey } from '../navArm';
import { SKELETON } from './model';
import type { Entries } from './store';
import styles from './host.module.css';

function NeedsYou({ env, veiled }: { env: ScreenEnvelope<'needs-you'>; veiled: boolean }) {
  const { view, runner } = env.props;
  const body =
    view.kind === 'desk' ? (
      <NeedsStore demo={view.demo}>
        <NeedsYouScreen demo={view.demo} runner={runner} />
      </NeedsStore>
    ) : view.kind === 'live' ? (
      <NeedsYouLive items={view.items} seeded={view.seeded} project={view.project} evidence={view.evidence} decided={view.decided} now={view.now} runner={runner} />
    ) : (
      <NeedsYouEmpty seeded={view.seeded} demo={view.demo} runner={runner} />
    );
  // the kept rows are never shown as if fresh: inert and dimmed until this activation's read lands
  return (
    <div className={styles.veil} data-veiled={veiled || undefined} inert={veiled} aria-busy={veiled}>
      {body}
    </div>
  );
}

export function HostScreen({ k, entries }: { k: ArmScreenKey; entries: Entries }) {
  if (k === 'fleet') {
    const env = entries.fleet?.env;
    return env ? <FleetScreen {...env.props} /> : <ScreenSkeleton {...SKELETON.fleet} />;
  }
  if (k === 'monitor') {
    const env = entries.monitor?.env;
    return env ? <MonitorScreen data={env.props.data} estate={env.props.estate} /> : <ScreenSkeleton {...SKELETON.monitor} />;
  }
  const e = entries['needs-you'];
  return e?.env ? <NeedsYou env={e.env} veiled={e.veiled} /> : <ScreenSkeleton {...SKELETON['needs-you']} />;
}
