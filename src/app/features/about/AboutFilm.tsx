'use client';

// /about: the onboarding contest's winning film (its L0 only), full-bleed, outside the app window. One change travels a
// night road from a finding to production, one station per beat of the app's loop: an intro (skippable by any key), then
// the caption follows the beat, the timeline scrubs and plays, and the last beat hands on to Theater. Esc follows the
// breadcrumb back to the door when the viewer came from it (?from=door), else "Enter Afterlife" into the app (keys/leave).
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '@/app/features/theater/hooks/useReducedMotion';
import { Scene } from './art/Scene';
import { Caption } from './components/Caption';
import { Fireflies } from './components/Fireflies';
import { Intro } from './components/Intro';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { useAutoplay } from './hooks/useAutoplay';
import { useFilmCamera } from './hooks/useFilmCamera';
import { useFilmKeys } from './hooks/useFilmKeys';
import { leaveHref } from './keys/leave';
import { voiceOf, type AboutData } from './model/beats';
import { INTRO_FROM, shotAt } from './model/camera';
import { buildCity } from './model/city';
import { filmReducer, initialFilm } from './model/playback';
import { buildRoute } from './model/road';
import s from './components/film.module.css';

export function AboutFilm({ data }: { data: AboutData }) {
  const { beats } = data;
  const n = beats.length;
  const [st, dispatch] = useReducer(filmReducer, n, initialFilm);
  // A preview belongs to the beat it was made on: a scrub (click or key) clears it without an effect.
  const [hov, setHov] = useState({ i: -1, at: 0 });
  const reduced = useReducedMotion();
  const route = useMemo(() => buildRoute(n), [n]);
  const city = useMemo(() => buildCity(), []);
  const voices = useMemo(() => beats.map((b, i) => voiceOf(b.key, i)), [beats]);
  const shot0 = useMemo(() => shotAt(route, INTRO_FROM, 0, false), [route]);
  // The page sits behind <Suspense> and connection() (app/about/page.tsx), so the search param is read at request time.
  const out = leaveHref(useSearchParams().get('from'));
  const esc = useRef<HTMLAnchorElement>(null);

  const intro = st.phase === 'intro';
  const onIntroDone = useCallback(() => dispatch({ type: 'endIntro', autoplay: !reduced }), [reduced]);
  const svgRef = useFilmCamera({ route, n, beat: st.beat, phase: st.phase, reduced, onIntroDone });
  useAutoplay(st, dispatch);
  useFilmKeys(st, dispatch, () => esc.current?.click());

  const hover = !intro && hov.at === st.beat ? hov.i : -1;
  const setHover = useCallback((i: number) => setHov({ i, at: st.beat }), [st.beat]);
  const pick = useCallback((i: number) => dispatch({ type: 'goto', beat: i }), []);
  const ghost = hover >= 0 && hover !== st.beat;
  const shown = ghost ? hover : st.beat;
  const cur = beats[st.beat];

  return (
    <div className={s.root} style={{ '--acc': intro ? 'var(--accent)' : (voices[shown] ?? 'var(--accent)') } as CSSProperties} data-role="about-film">
      <h1 className="sr-only">About Afterlife: one change, from a finding to production</h1>
      <TopBar out={out} escRef={esc} />
      <main
        className={s.mid}
        onClick={(e) => {
          if (intro && !(e.target instanceof Element && e.target.closest('button, a'))) dispatch({ type: 'skipIntro' });
        }}
      >
        <Scene
          className={s.scene}
          city={city}
          route={route}
          beats={beats}
          voices={voices}
          on={intro ? -1 : st.beat}
          hover={hover}
          tag={cur && !intro ? cur.stage : ''}
          svgRef={svgRef}
          shot0={shot0}
          onPick={pick}
          onHover={setHover}
        />
        <div className={s.grade} />
        <div className={s.scrim} />
        <Fireflies />
        {beats[shown] ? <Caption beat={beats[shown]} i={shown} n={n} ghost={ghost} hidden={intro} /> : null}
        {n === 0 ? <p className={s.empty}>The loop has no beats to play.</p> : null}
        <Intro on={intro} onSkip={() => dispatch({ type: 'skipIntro' })} />
        <span className={s.stylised}>Stylised illustration</span>
        <div className={s.vig} />
      </main>
      <Timeline beats={beats} beat={st.beat} playing={st.playing} out={out} onToggle={() => dispatch({ type: 'toggle' })} onPick={pick} onHover={setHover} />
      <p className="sr-only" aria-live="polite">
        {!intro && cur ? `Beat ${st.beat + 1} of ${n}: ${cur.label}. ${cur.text}` : ''}
      </p>
    </div>
  );
}
