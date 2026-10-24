// The intro's words over the wide shot: the promise, and the skip (any key does it too). It fades out when the film
// takes over; it stays in the tree so the fade can run.
import s from './intro.module.css';

export function Intro({ on, onSkip }: { on: boolean; onSkip(): void }) {
  return (
    <div className={`${s.intro} ${on ? '' : s.hide}`} aria-hidden={!on} data-role="about-intro">
      <p className={s.i1}>Watch one change travel from a finding to production.</p>
      <p className={s.i2}>Nobody clicks.</p>
      <button type="button" className={s.skip} onClick={onSkip} tabIndex={on ? 0 : -1}>
        Skip intro · any key
      </button>
    </div>
  );
}
