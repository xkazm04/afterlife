// The beat's caption, bottom left over the scene: kicker (number, stage, who), the beat's name at display size, its line
// from the loop. A previewed beat (pointer or focus on another stop) shows ghosted. The last beat, the summary, hands
// the viewer on to Theater, where the same loop replays step by step.
import Link from 'next/link';
import { kickerOf, pad2, type AboutBeat } from '../model/beats';
import s from './caption.module.css';

interface Props {
  beat: AboutBeat;
  i: number;
  n: number;
  ghost: boolean;
  hidden: boolean;
}

export function Caption({ beat, i, n, ghost, hidden }: Props) {
  const last = i === n - 1;
  return (
    <div className={`${s.cap} ${hidden ? s.hide : ''}`} data-role="about-caption">
      <div className={s.kick}>{ghost ? `go to beat ${pad2(i + 1)} / ${pad2(n)}` : kickerOf(beat, i, n)}</div>
      <h2 key={`${i}-${ghost}`} className={`${s.title} ${ghost ? s.ghost : ''}`}>
        {beat.label}
      </h2>
      <p className={s.text}>{beat.text}</p>
      {last && !ghost ? (
        <Link className={s.cta} href="/theater" data-role="about-theater" tabIndex={hidden ? -1 : 0}>
          Replay it step by step in Theater
        </Link>
      ) : null}
    </div>
  );
}
