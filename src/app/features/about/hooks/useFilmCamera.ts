'use client';

// The film's camera in the browser: it eases between shots on requestAnimationFrame and writes each frame straight into
// the scene's layers, the trail and the light (found under the scene's <svg> by data attributes, never React state). It
// runs the intro (the light travels the whole route in the wide shot, then the camera comes in on the first beat, about
// 3.7 s in all) and then follows the beat. Reduced motion: no travel and no sway; the intro holds still, every move is a cut.
import { useEffect, useMemo, useRef } from 'react';
import { INTRO_FROM, LAYERS, shotAt, type Cam } from '../model/camera';
import type { Phase } from '../model/playback';
import type { Route } from '../model/road';
import { easeInOut, lerp } from '../model/rng';

/** The intro's two moves (ms), and how long a reduced-motion intro holds its words. */
export const INTRO_TRAVEL_MS = 2500;
export const INTRO_LAND_MS = 1150;
export const INTRO_HOLD_MS = 3200;
const BEAT_MS = 1250;

interface Anim {
  from: Cam;
  to: Cam;
  t0: number;
  dur: number;
  done(ok: boolean): void;
}

interface Opts {
  route: Route;
  n: number;
  beat: number;
  phase: Phase;
  reduced: boolean;
  onIntroDone(): void;
}

export function useFilmCamera({ route, n, beat, phase, reduced, onIntroDone }: Opts) {
  const svg = useRef<SVGSVGElement>(null);
  const cam = useRef<Cam>({ ...INTRO_FROM });
  const anim = useRef<Anim | null>(null);
  const raf = useRef(0);
  const live = useRef({ reduced, route, onIntroDone });
  useEffect(() => {
    live.current = { reduced, route, onIntroDone };
  });

  // The engine: one frame paints the shot; it keeps going while a move runs, or (motion allowed, tab visible) for the sway.
  const engine = useMemo(() => {
    const paint = (now: number) => {
      const root = svg.current;
      if (!root) return;
      const sh = shotAt(live.current.route, cam.current, now, !live.current.reduced);
      for (const l of LAYERS) root.querySelector(`[data-layer="${l.id}"]`)?.setAttribute('transform', sh.layers[l.id]);
      root.querySelector('[data-cam="token"]')?.setAttribute('transform', sh.token);
      const dash = `${sh.trail.toFixed(1)} 99999`;
      root.querySelectorAll('[data-cam="trail"]').forEach((el) => el.setAttribute('stroke-dasharray', dash));
    };
    const frame = (now: number) => {
      raf.current = 0;
      const a = anim.current;
      if (a) {
        const p = a.dur > 0 ? Math.min(1, (now - a.t0) / a.dur) : 1;
        const e = easeInOut(p);
        cam.current = { t: lerp(a.from.t, a.to.t, e), z: lerp(a.from.z, a.to.z, e) };
        if (p >= 1) {
          anim.current = null;
          a.done(true);
        }
      }
      paint(now);
      if (anim.current || (!live.current.reduced && !document.hidden)) kick();
    };
    const kick = () => {
      if (!raf.current) raf.current = requestAnimationFrame(frame);
    };
    /** Moves the camera; resolves true when it lands, false when a newer move replaced it. */
    const go = (to: Cam, dur: number) =>
      new Promise<boolean>((done) => {
        anim.current?.done(false);
        anim.current = { from: { ...cam.current }, to, t0: performance.now(), dur: live.current.reduced ? 0 : dur, done };
        kick();
      });
    const stop = () => {
      anim.current?.done(false);
      anim.current = null;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    return { kick, go, stop };
  }, []);

  // The intro: travel the route wide, then land on the first beat. Reduced motion holds the wide shot still instead.
  useEffect(() => {
    if (phase !== 'intro') return;
    let on = true;
    let hold = 0;
    if (reduced) {
      hold = window.setTimeout(() => on && live.current.onIntroDone(), INTRO_HOLD_MS);
    } else {
      void (async () => {
        if (!(await engine.go({ t: Math.max(0, n - 1), z: 0 }, INTRO_TRAVEL_MS)) || !on) return;
        if (!(await engine.go({ t: 0, z: 1 }, INTRO_LAND_MS)) || !on) return;
        live.current.onIntroDone();
      })();
    }
    return () => {
      on = false;
      window.clearTimeout(hold);
      engine.stop(); // a skipped intro, or motion turned off mid-travel: the move stops where it is
    };
  }, [phase, reduced, n, engine]);

  // The film: every beat change moves the camera to it (a cut under reduced motion).
  useEffect(() => {
    if (phase !== 'film') return;
    void engine.go({ t: beat, z: 1 }, BEAT_MS);
  }, [phase, beat, engine]);

  // The sway resumes when the tab comes back or motion is allowed again; everything stops on unmount.
  useEffect(() => {
    engine.kick();
    const onVis = () => {
      if (!document.hidden) engine.kick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reduced, engine]);
  useEffect(() => () => engine.stop(), [engine]);

  return svg;
}
