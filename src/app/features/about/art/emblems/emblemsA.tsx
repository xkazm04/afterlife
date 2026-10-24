// The road's glyphs, first half: one small emblem per beat, centred on (0, 0), drawn in the beat's voice (--e, set by the
// station). Hand-built SVG from the contest winner's art.js, colours moved to classes.
import s from './emblems.module.css';

/** Finding: a lens over a cross, the scanner's mark. */
export const Finding = () => (
  <>
    <circle className={s.disk} r={22} strokeWidth={4} />
    <path className={s.line} d="M16 16 L33 33" strokeWidth={7} strokeLinecap="round" />
    <path className={s.alt} d="M-9 0h18M0 -9v18" strokeWidth={3.5} strokeLinecap="round" />
  </>
);

/** Red test: a flask, half full. */
export const RedTest = () => (
  <>
    <path className={s.line} d="M-7 -32h14M-5 -32v20L-26 20a7 7 0 0 0 6 11h40a7 7 0 0 0 6-11L5 -12v-20" strokeWidth={4} strokeLinejoin="round" />
    <path className={s.fill} d="M-20 12h40l6 8a5 5 0 0 1-4 9H-22a5 5 0 0 1-4-9z" opacity={0.7} />
  </>
);

/** Patch: a square stitched across. */
export const Patch = () => (
  <>
    <rect className={s.disk} x={-26} y={-26} width={52} height={52} rx={7} strokeWidth={3} />
    <path className={s.ink} d="M-26 -8l14 6 10 -10 12 12 14 -4" strokeWidth={3} />
    <path className={s.line} d="M-16 -16l32 32M16 -16l-32 32" strokeWidth={3.5} strokeDasharray="6 5" strokeLinecap="round" />
  </>
);

/** Proof Block: a stamped seal with a tick. */
export const Proof = () => (
  <>
    <circle className={s.disk} r={27} strokeWidth={3.5} />
    <circle className={s.line} r={19} strokeWidth={1.8} strokeDasharray="3 4" />
    <path className={s.line} d="M-10 1l7 8 14-17" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

/** Guardrail: a barred arch. */
export const Guard = () => (
  <>
    <path className={s.disk} d="M-24 28V-4a24 24 0 0 1 48 0v32z" strokeWidth={3.5} />
    <path className={s.line} d="M-12 28V-8M0 28V-14M12 28V-8" strokeWidth={3} />
    <circle className={s.fill} cy={-30} r={5} />
  </>
);
