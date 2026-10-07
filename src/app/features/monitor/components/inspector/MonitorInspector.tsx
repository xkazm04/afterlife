'use client';

import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { Stats } from '@/components/inspector/blocks/Stats';
import { FeedAge } from '@/components/status/FeedAge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { StageTicks } from '@/components/viz/StageTicks';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { liveNeeds, stateLine, topWaiting } from '../../model/totals';
import type { Totals } from '../../model/types';
import { Decisions } from './Decisions';
import styles from './inspector.module.css';

const EXITS: readonly [string, string][] = [
  ['Fleet', '/fleet'],
  ['Needs you', '/needs-you'],
  ['Ladder', '/ladder'],
  ['Maturity', '/maturity'],
  ['Theater', '/theater'],
];

function Overview({ org, totals, projects, onPick }: { org: string; totals: Totals; projects: readonly FleetProject[]; onPick: (id: string) => void }) {
  return (
    <>
      <InspectorHeader title={org} sub={`${totals.n} projects · pick a beat to act on it`} />
      <Stats
        cells={[
          { n: totals.needs, label: 'decisions wait', tone: 'you' },
          { n: totals.stale, label: 'stale' },
          { n: totals.quar, label: 'quarantined' },
        ]}
      />
      <InspectorSection title="Most waiting">
        {topWaiting(projects, 8).map((p) => (
          <button key={p.id} type="button" className={styles.pick} onClick={() => onPick(p.id)}>
            <span className={styles.n}>{p.needsYou}</span>
            <span>{p.name}</span>
            <span className={styles.g}>{p.group}</span>
          </button>
        ))}
      </InspectorSection>
    </>
  );
}

/** The inspector: the fleet overview with nothing picked, else the picked project's vitals and its items to act on. */
export function MonitorInspector(props: {
  p: FleetProject | null;
  org: string;
  totals: Totals;
  projects: readonly FleetProject[];
  stages: readonly string[];
  deepId: string;
  needs: readonly NeedsYouItem[];
  live: boolean;
  done: ReadonlySet<string>;
  onPick: (id: string) => void;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
  onRepoll: (id: string) => void;
}) {
  const { p } = props;
  if (!p) return <Overview org={props.org} totals={props.totals} projects={props.projects} onPick={props.onPick} />;
  const watched = p.state !== 'not-set-up';
  const cells = [
    { n: liveNeeds(p), label: 'decisions', tone: 'you' as const },
    { n: p.armed, label: 'of 8 tracks armed' },
    ...(p.proofs7d ? [{ n: p.proofs7d.pass, label: 'proofs pass · 7 d', tone: 'ok' as const }, { n: p.proofs7d.fail, label: 'fail' }] : []),
  ];
  return (
    <>
      <InspectorHeader title={p.name} icon={<StateGlyph state={p.state} />} sub={p.what} path={`${props.org}/${p.group}/${p.id}`}>
        <div className={styles.line} data-state={p.state}>
          {stateLine(p)}
        </div>
      </InspectorHeader>
      {watched ? <Stats cells={cells} /> : <div className={styles.muted}>Not watched: proofs, tiers and stages are unknown.</div>}
      <Decisions p={p} isDeep={p.id === props.deepId} needs={props.needs} live={props.live} done={props.done} onResolve={props.onResolve} onFlash={props.onFlash} onRepoll={props.onRepoll} />
      {watched ? (
        <InspectorSection title="Signal" aux={<FeedAge ageSec={p.feed.ageSec} ok={p.feed.ok} error={p.feed.error} />}>
          <StageTicks rungs={p.stages} labels={props.stages} />
          <div className={styles.tiers}>
            {TIER_DISPLAY_ORDER.map((t) => (
              <span key={t} className={styles.tier} data-tier={t} title={TIER_META[t].name}>
                <TierMark tier={t} stale={p.state === 'stale'} />
                {p.tiers?.[t] ?? 0}
              </span>
            ))}
          </div>
        </InspectorSection>
      ) : null}
      <InspectorSection title="Open">
        <div className={styles.acts}>
          {EXITS.map(([label, href]) => (
            <Button key={href} href={href}>
              {label}
            </Button>
          ))}
        </div>
      </InspectorSection>
    </>
  );
}
