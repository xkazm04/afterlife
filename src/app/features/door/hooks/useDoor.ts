'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { HOME, frameDistrict, frameTower, onStage, type Cam } from '../model/camera';
import { districtsOf, type District, type Placed } from '../model/city';
import { MARK_TEST, type MarkKind } from '../model/words';

export type Level = 0 | 1 | 2;
const INTRO_MS = 3400;

/**
 * The front door's state: the level (fleet, district, project), what is open, what the pointer is on, the lit mark,
 * the camera and the intro. Every transition is a new camera target; the CSS transition does the moving.
 */
export function useDoor(groups: readonly string[], projects: readonly FleetProject[]) {
  const ds = useMemo(() => districtsOf(groups, projects), [groups, projects]);
  const byId = useMemo(() => new Map<string, { d: District; t: Placed }>(ds.flatMap((d) => d.placed.map((t) => [t.p.id, { d, t }] as const))), [ds]);
  const [level, setLevel] = useState<Level>(0);
  const [curG, setCurG] = useState<number | null>(null);
  const [curP, setCurP] = useState<string | null>(null);
  const [hotG, setHotG] = useState<number | null>(null);
  const [hotId, setHotId] = useState<string | null>(null);
  const [mark, setMark] = useState<MarkKind | null>(null);
  const [cam, setCam] = useState<Cam>(HOME);
  const [camMs, setCamMs] = useState(850);
  const [liftFrom, setLiftFrom] = useState<{ x: number; y: number; k0: number } | null>(null);
  const [intro, setIntro] = useState(true);

  const endIntro = useCallback(() => setIntro(false), []);
  useEffect(() => {
    const id = setTimeout(endIntro, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : INTRO_MS);
    return () => clearTimeout(id);
  }, [endIntro]);

  const openG = useCallback(
    (gi: number) => {
      const d = ds[gi];
      if (!d) return;
      endIntro();
      setCamMs(level === 2 ? 700 : 850);
      setLevel(1);
      setCurG(gi);
      setCurP(null);
      setHotG(null);
      setHotId(null);
      setMark(null);
      setCam(frameDistrict(d));
    },
    [ds, level, endIntro],
  );

  const openP = useCallback(
    (id: string) => {
      const hit = byId.get(id);
      if (!hit) return;
      endIntro();
      const l1 = frameDistrict(hit.d);
      setLiftFrom(onStage(l1, hit.t));
      setCurG(hit.d.gi);
      setCurP(id);
      setLevel(2);
      setHotId(null);
      setCamMs(900);
      setCam(frameTower(hit.d, hit.t));
    },
    [byId, endIntro],
  );

  const goHome = useCallback(() => {
    setCamMs(850);
    setLevel(0);
    setCurG(null);
    setCurP(null);
    setHotId(null);
    setCam(HOME);
  }, []);

  const up = useCallback(() => {
    if (level === 2 && curG != null) openG(curG);
    else if (level === 1) goHome();
  }, [level, curG, openG, goHome]);

  /** Pointer or focus over the city: a tower (id) inside a district (gi), or nothing. */
  const hover = useCallback(
    (gi: number | null, id: string | null) => {
      if (level === 0) {
        setHotG(gi);
        setHotId(id);
      } else if (level === 1) setHotId(id && byId.get(id)?.d.gi === curG ? id : null);
    },
    [level, curG, byId],
  );

  /** A click or Enter on the city: the fleet opens a district, a district opens one of its towers. */
  const pick = useCallback(
    (gi: number | null, id: string | null) => {
      if (level === 0 && gi != null) openG(gi);
      else if (level === 1 && id && byId.get(id)?.d.gi === curG) openP(id);
      else if (level === 1 && gi != null && gi !== curG) openG(gi);
    },
    [level, curG, byId, openG, openP],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (intro) endIntro();
      if (e.key === 'Escape' && !e.defaultPrevented) up();
    };
    const press = () => intro && endIntro();
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', press);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', press);
    };
  }, [intro, up, endIntro]);

  const dim = useMemo(() => (mark ? new Set(projects.filter((p) => !MARK_TEST[mark](p)).map((p) => p.id)) : null), [mark, projects]);

  return { ds, byId, level, curG, curP, hotG, hotId, setHotId, mark, setMark, dim, cam, camMs, liftFrom, intro, endIntro, openG, openP, goHome, up, hover, pick };
}
