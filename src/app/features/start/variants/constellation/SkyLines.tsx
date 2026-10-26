import { SKY, linkOf, type Spot, type Star } from './sky';
import styles from './sky.module.css';

/** The line from this machine to one step, in the step's state. A broken line has a gap at its middle. */
function Link({ to, state }: { to: Spot; state: Star['step']['state'] }) {
  const { cx, cy } = SKY;
  const kind = linkOf(state);
  const at = (t: number) => ({ x: Math.round(cx + (to.x - cx) * t), y: Math.round(cy + (to.y - cy) * t) });
  if (kind === 'broken') {
    const a = at(0.46);
    const b = at(0.6);
    return (
      <g className={styles.link} data-link={kind}>
        <line x1={cx} y1={cy} x2={a.x} y2={a.y} vectorEffect="non-scaling-stroke" />
        <line x1={b.x} y1={b.y} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }
  return (
    <g className={styles.link} data-link={kind}>
      <line x1={cx} y1={cy} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" />
      {/* the flow: short dashes travelling outwards along the line while its check runs */}
      {kind === 'flow' ? <line className={styles.flow} x1={cx} y1={cy} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" /> : null}
    </g>
  );
}

/**
 * The lines layer: the dashed orbit, then one link per step from the centre. Stretched over the stage
 * (preserveAspectRatio none, strokes that do not scale) so the HTML nodes placed in percent stay on their ends.
 */
export function SkyLines({ stars }: { stars: readonly Star[] }) {
  return (
    <svg className={styles.lines} viewBox={`0 0 ${SKY.w} ${SKY.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ellipse className={styles.orbit} cx={SKY.cx} cy={SKY.cy} rx={SKY.rx} ry={SKY.ry} vectorEffect="non-scaling-stroke" />
      {stars.map((s) => (
        <Link key={s.step.key} to={s.at} state={s.step.state} />
      ))}
    </svg>
  );
}
