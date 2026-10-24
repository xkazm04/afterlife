// Sixteen fireflies over the ground, placed from a fixed seed (the same on the server and in the browser). Reduced
// motion hides them.
import type { CSSProperties } from 'react';
import { rng } from '../model/rng';
import s from './film.module.css';

const FLIES = (() => {
  const R = rng(99);
  return Array.from({ length: 16 }, () => ({
    left: `${(R() * 94).toFixed(1)}%`,
    top: `${(57 + R() * 39).toFixed(1)}%`,
    '--d': `${(5 + R() * 7).toFixed(1)}s`,
    '--dx': `${(R() * 60 - 30).toFixed(0)}px`,
    '--dy': `${(R() * -50).toFixed(0)}px`,
  }));
})();

export function Fireflies() {
  return (
    <div className={s.flies} aria-hidden="true">
      {FLIES.map((style, i) => (
        <i key={i} style={style as CSSProperties} />
      ))}
    </div>
  );
}
