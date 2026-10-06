import type { Stage } from '@/schemas';
import type { CreditEntry } from '../data/types';
import type { MaturityCtx } from './ctx';
import type { Phase } from './flow/credit';
import type { Level, Mode } from './rungs';

export type Step = 1 | 2 | 3 | 4;
export type SectionKey = 'ev' | 'gap' | 'day0' | 'hist';

/** A one-line message for the toast and status bar. `seq` changes every time, so equal texts still show. */
export interface Notice {
  seq: number;
  text: string;
}

export interface MaturityState {
  mode: Mode;
  sel: Stage;
  step: Step;
  /** The gap being previewed in step 2. */
  pv: string | null;
  /** Which file tab each gap's diff shows. */
  file: Readonly<Record<string, number>>;
  /** The Send-as-you sheet is open (only ever with step 3). */
  sheet: boolean;
  picked: readonly string[];
  /** The rung each stage holds now; changes only when a rescan credits. */
  now: Readonly<Record<Stage, Level>>;
  /** Gap id -> where it is, once sent. */
  flow: Readonly<Record<string, Phase>>;
  /** Credit rows earned in this session. */
  log: readonly CreditEntry[];
  scannedAt: string;
  ageMin: number;
  /** Bumped when the ropes should draw themselves again (mode change, a credit). */
  animKey: number;
  open: Readonly<Record<SectionKey, boolean>>;
  notice: Notice | null;
}

export function initialState(ctx: MaturityCtx): MaturityState {
  return {
    mode: 'now',
    sel: ctx.stages.includes('secure') ? 'secure' : (ctx.stages[0] ?? 'plan'),
    step: 1,
    pv: null,
    file: {},
    sheet: false,
    picked: ctx.gaps.filter((g) => g.picked).map((g) => g.id),
    now: Object.fromEntries(ctx.stages.map((s) => [s, ctx.base[s].now])) as Record<Stage, Level>,
    flow: {},
    log: [],
    scannedAt: ctx.scannedAt,
    ageMin: ctx.scanAgeMin,
    animKey: 0,
    open: { ev: true, gap: true, day0: false, hist: false },
    notice: null,
  };
}

/** Picked gaps that have not been sent yet, in the dataset's order. */
export function pendingIds(s: MaturityState, ctx: MaturityCtx): string[] {
  return ctx.gaps.map((g) => g.id).filter((id) => s.picked.includes(id) && !s.flow[id]);
}

export const inFlightIds = (s: MaturityState): string[] => Object.keys(s.flow);
