// The road's glyphs, second half, and the map from a loop key to its emblem (a key the film does not know: Plain).
import type { ReactNode } from 'react';
import { Finding, Guard, Patch, Proof, RedTest } from './emblemsA';
import s from './emblems.module.css';

/** Tier gate: a ladder, one rung lit. */
const Gate = () => (
  <>
    <path className={s.line} d="M-14 -32V32M14 -32V32" strokeWidth={4.5} strokeLinecap="round" />
    <path className={s.line} d="M-14 -20h28M-14 -6h28M-14 8h28M-14 22h28" strokeWidth={4} />
    <circle className={s.cream} cx={14} cy={-6} r={6} />
  </>
);

/** Staging: a curtained stage. */
const Staging = () => (
  <>
    <path className={s.disk} d="M-30 -30h60M-30 -30v50q15 -8 30 0t30 0v-50" strokeWidth={3.5} />
    <path className={s.line} d="M-14 -30v46M0 -30v50M14 -30v46" strokeWidth={2} opacity={0.7} />
    <ellipse className={s.fill} cy={30} rx={30} ry={6} opacity={0.5} />
  </>
);

/** Production: a lighthouse. */
const Prod = () => (
  <>
    <path className={s.disk} d="M-14 32L-8 -14h16l6 46z" strokeWidth={3.5} />
    <path className={s.fill} d="M-10 -14h20l-3 -12h-14z" />
    <circle className={s.white} cy={-34} r={7} opacity={0.95} />
    <path className={s.line} d="M-34 -34h-14M34 -34h14M-26 -50l-9 -9M26 -50l9 -9" strokeWidth={3} strokeLinecap="round" />
  </>
);

/** Summary: a written note. */
const Summary = () => (
  <>
    <path className={s.fill} d="M-24 -26h42a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8h-42a8 8 0 0 0 8-8z" />
    <path className={s.ink} d="M-14 -12h28M-14 0h28M-14 12h16" strokeWidth={3.5} strokeLinecap="round" />
    <circle className={s.dim} cx={-24} cy={-22} r={5} strokeWidth={3} />
  </>
);

/** Any other beat: a plain ring with a dot. */
const Plain = () => (
  <>
    <circle className={s.disk} r={22} strokeWidth={4} />
    <circle className={s.fill} r={7} />
  </>
);

const BY_KEY: Record<string, () => ReactNode> = {
  finding: Finding,
  red: RedTest,
  patch: Patch,
  proof: Proof,
  guard: Guard,
  gate: Gate,
  staging: Staging,
  prod: Prod,
  summary: Summary,
};

export function Emblem({ beatKey }: { beatKey: string }) {
  const E = BY_KEY[beatKey] ?? Plain;
  return <E />;
}
