'use client';

import { useCallback, useMemo } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { BottomChrome, TopChrome } from './components/chrome/Chrome';
import { L2View } from './components/l2/L2View';
import type { Deep } from './components/l2/L2Panel';
import { Rail } from './components/rail/Rail';
import { Scene } from './components/scene/Scene';
import { SceneDefs } from './components/scene/SceneDefs';
import { Answer } from './components/ui/Answer';
import { Labels } from './components/ui/Labels';
import { Readout } from './components/ui/Readout';
import { useDoor } from './hooks/useDoor';
import { useStageFit } from './hooks/useStageFit';
import { useQuality } from './hooks/useQuality';
import { useStill } from './hooks/useStill';
import { districtLine, fleetTotals, projectLine, topTiers, type Part } from './model/words';
import styles from './door.module.css';

export interface DoorData {
  org: string;
  asOf: string;
  groups: readonly string[];
  classes: readonly string[];
  stages: readonly string[];
  projects: readonly FleetProject[];
  deep: Deep;
}

/**
 * The front door (contest winner "Night Shift", ported): the fleet as a city at night. Each group is a district, each
 * project a tower, each waiting decision an amber beam. Click a district to open it, a tower to lift it out; Esc goes
 * back up; Enter Afterlife goes into the app.
 */
export function DoorScreen({ data }: { data: DoorData }) {
  useStageFit();
  useQuality();
  const s = useDoor(data.groups, data.projects);
  const still = useStill();
  // what does not change with the pointer is computed once, so a hover re-renders only the readout and the marks
  const totals = useMemo(() => fleetTotals(data.projects), [data.projects]);
  const tiersTop = useMemo(() => topTiers(data.projects), [data.projects]);
  const staleTop = useMemo(() => s.ds.slice().sort((a, b) => b.stale - a.stale)[0] ?? null, [s.ds]);
  const { ds, openG, hover, goHome, curG: openGi } = s;
  const onOpenTop = useCallback(
    (k: 'needs' | 'stale') => {
      const best = ds.slice().sort((a, b) => (k === 'needs' ? b.needs - a.needs : b.stale - a.stale))[0];
      if (best) openG(best.gi);
    },
    [ds, openG],
  );
  const onLabelHover = useCallback((gi: number | null) => hover(gi, null), [hover]);
  const onGo = useCallback((l: 0 | 1) => (l === 0 ? goHome() : openGi != null && openG(openGi)), [goHome, openG, openGi]);
  const cur = s.curG != null ? (s.ds[s.curG] ?? null) : null;
  const hot = s.hotId ? s.byId.get(s.hotId) : undefined;
  const open = s.curP ? s.byId.get(s.curP) : undefined;

  let name: string | null = null;
  let line: Part[] = [];
  let tiers: (string | null)[] | null = null;
  if (s.level < 2 && hot) {
    name = hot.t.p.name;
    line = projectLine(hot.t.p);
    tiers = hot.t.p.state === 'not-set-up' ? null : data.classes.map((k) => hot.t.p.classTiers?.[k] ?? null);
  } else if (s.level === 0 && s.hotG != null && s.ds[s.hotG]) {
    name = s.ds[s.hotG]!.name;
    line = districtLine(s.ds[s.hotG]!);
  } else if (s.level === 1 && cur) {
    name = cur.name;
    line = districtLine(cur);
  }

  const openName = open?.t.p.name;
  const crumbs = useMemo(
    () => [
      s.level === 0 ? { label: data.org } : { label: data.org, go: 0 as const },
      ...(s.level === 0 ? [{ label: `fleet of ${totals.n} projects` }] : []),
      ...(cur ? [s.level === 1 ? { label: cur.name } : { label: cur.name, go: 1 as const }] : []),
      ...(openName && s.level === 2 ? [{ label: openName }] : []),
    ],
    [s.level, data.org, totals.n, cur, openName],
  );

  return (
    <div className={styles.root} data-level={s.level} data-intro={s.intro ? 'on' : undefined} data-still={still || undefined}>
      <SceneDefs />
      {/* Night Shift's stacking: art (1), vignette and scan (3), the UI (5), chrome (20), grain (40) */}
      <div className={`${styles.stage} ${styles.artStage}`}>
        <div className={styles.art}>
          <Scene
            ds={s.ds}
            classes={data.classes}
            level={s.level}
            curG={s.curG}
            hotG={s.hotG}
            hotTower={hot?.t ?? null}
            dim={s.dim}
            cam={s.cam}
            camMs={s.camMs}
            onHover={s.hover}
            onPick={s.pick}
          />
        </div>
        <div className={styles.scrim} aria-hidden />
      </div>
      <div className={styles.fx} aria-hidden>
        <div className={styles.vig} />
        <div className={styles.scan} data-ambient="city" data-lite="off" />
      </div>
      <div className={`${styles.stage} ${styles.uiStage}`}>
        <div className={styles.ui}>
          <Answer totals={totals} tiers={tiersTop} staleTop={staleTop} intro={s.intro} tabbable={s.level === 0} onMark={s.setMark} onOpen={onOpenTop} />
          <Labels ds={s.ds} hotG={s.hotG} tabbable={s.level === 0} onHover={onLabelHover} onOpen={s.openG} />
          <Readout name={name} line={line} tiers={tiers} />
          {s.level === 1 && cur ? <Rail key={cur.gi} d={cur} hotId={s.hotId} onHover={s.setHotId} onOpen={s.openP} /> : null}
          {s.level === 2 && open && s.liftFrom ? (
            <L2View key={open.t.p.id} p={open.t.p} group={open.d.name} classes={data.classes} stages={data.stages} deep={data.deep} from={s.liftFrom} />
          ) : null}
          {s.intro ? (
            <button type="button" className={styles.skip} data-lite="off" onClick={s.endIntro}>
              Skip intro
            </button>
          ) : null}
        </div>
      </div>
      <TopChrome org={data.org} asOf={data.asOf} />
      <BottomChrome crumbs={crumbs} onBack={s.level > 0 ? s.up : null} onGo={onGo} />
      <div className={styles.grain} data-lite="off" aria-hidden />
    </div>
  );
}
