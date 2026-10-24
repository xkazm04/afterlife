// The bottom timeline: play or pause, then one stop per beat. A click (or Left and Right anywhere) scrubs; pointer or
// focus on a stop previews it in the caption. Past stops are filled, the one on screen is marked current.
import type { CSSProperties } from 'react';
import { pad2, type AboutBeat } from '../model/beats';
import s from './timeline.module.css';

interface Props {
  beats: readonly AboutBeat[];
  beat: number;
  playing: boolean;
  onToggle(): void;
  onPick(i: number): void;
  onHover(i: number): void;
}

export function Timeline({ beats, beat, playing, onToggle, onPick, onHover }: Props) {
  const n = beats.length;
  const p = n > 1 ? beat / (n - 1) : 0;
  return (
    <footer className={s.bar}>
      <button type="button" className={s.play} onClick={onToggle} aria-label={playing ? 'Pause the film' : 'Play the film'} data-role="about-play">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          {playing ? <path d="M3 2h4v14H3zM11 2h4v14h-4z" /> : <path d="M4 2l12 7-12 7z" />}
        </svg>
      </button>
      <div className={s.wrap} style={{ '--p': p } as CSSProperties}>
        <div className={s.line} />
        <div className={s.fill} />
        <ol className={s.tl}>
          {beats.map((b, i) => (
            <li key={i}>
              <button
                type="button"
                className={`${s.notch} ${i < beat ? s.past : ''}`}
                aria-current={i === beat ? 'step' : undefined}
                aria-label={`Beat ${i + 1} of ${n}: ${b.label}`}
                onClick={() => onPick(i)}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(-1)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(-1)}
              >
                <span className={s.n}>{pad2(i + 1)}</span>
                <span className={s.tick} />
                <span className={s.lbl}>{b.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className={s.hint}>← → scrub · Space plays · Esc enters Afterlife</p>
    </footer>
  );
}
