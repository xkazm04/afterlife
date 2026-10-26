// /start's view contract: StartView is the ONE object every presentation variant renders (Focus, Constellation, Wire).
// A variant reads it and calls its functions; it never fetches and never calls the server itself. Steps are derived
// from live state on every render (model/steps/derive.ts), never stored. Keep the names stable: WP-D consumes them.
import type { CommandLine } from '@/components/inspector/CommandBlock';
import type { ClaudeRepo } from '@/schemas/vitals';
import type { WriteView } from '@/server/actions/words';
import type { OnboardError } from '@/server/discover/wire';
import type { AskTurn, SetupAction } from '@/server/start/wire';
import type { Group } from './stack/lines';
import type { CapRow, StartFacts, StepKey, StepState } from './types';

/** Where a step lives on the way from this machine to GitLab to Afterlife. */
export type Place = 'this machine' | 'GitLab' | 'Afterlife';

/** From this many seconds on, a check is slow: the screen says what it is still waiting on. */
export const SLOW_S = 12;

/** A check running now: what it reads, for how long, and who it waits on (the slow note names them). */
export interface Checking {
  what: string;
  sinceS: number;
  on: 'GitLab' | 'the model' | 'this machine' | 'Afterlife';
}

export interface StepView {
  key: StepKey;
  place: Place;
  title: string;
  state: StepState;
  /** ONE line: what was seen, or what to do. */
  line: string;
  checking?: Checking;
  /** To copy and run by hand; may be empty. */
  commands: readonly CommandLine[];
  /** The Run it action (opens its preview); absent when the step has none. */
  action?: SetupAction;
  /** The step takes a typed value instead (no local repo named the group). */
  input?: 'group-id';
  /** Behind "what this checks": the probe in one line, and the doctor's rows where they belong. */
  detail?: { probe: string; caps?: readonly CapRow[] };
}

/** An action between Run it (or the chat's card) and its answer: the server's exact preview, then the result. */
export interface PendingView {
  /** The step it came from; null when the chat proposed it. */
  step: StepKey | null;
  action: SetupAction;
  title: string;
  /** previewAction's answer (undefined while asked). save-project has none: it is the wizard's own save. */
  preview?: WriteView;
  /** save-project only: what the save writes, in one line. */
  summary?: string;
  busy: boolean;
  /** What the confirm did, in words; undefined until it answered. */
  result?: string;
  done: boolean;
  confirm: () => void;
  cancel: () => void;
}

export interface ChatTurn extends AskTurn {
  /** The catalogue action a reply proposed (the server validated it). */
  action?: SetupAction;
}

export interface ChatView {
  open: boolean;
  toggle: () => void;
  turns: readonly ChatTurn[];
  ask: (text: string) => void;
  thinking: boolean;
  elapsedS: number;
  error?: string;
  /** A reply's action into the same preview -> confirm flow as Run it. */
  propose: (action: SetupAction) => void;
}

export interface RepoView {
  repos: readonly ClaudeRepo[];
  picked?: string;
  /** Why the list is empty or partial (not this machine, the listing failed). */
  note?: string;
  pick: (root: string) => void;
}

export interface StackView {
  groups: readonly Group[];
  tally: { saved: number; total: number; failed: number };
  phase: 'pick' | 'proposing' | 'probing' | 'review' | 'saving' | 'saved';
  error?: OnboardError;
  slug?: string;
  /** "sonnet 5.5 · low · 41 s" once proposed. */
  engine?: string;
  rerun: () => void;
  save: () => void;
}

export interface SourceChips {
  mode: StartFacts['mode'];
  fake: boolean;
  host: string;
  group: string;
  /** Which name set each value: the env, a runtime setting, or nothing (the default). */
  sources: StartFacts['sources'];
}

export type Path = 'hand' | 'assist';

export interface StartView {
  /** In StepKey order: repo, glab, login, group, live, stack, save, unlock. */
  steps: readonly StepView[];
  /** The first step not done (the last when every one is). */
  current: StepKey;
  selected: StepKey;
  select: (k: StepKey) => void;
  /** The probe stream is running. */
  running: boolean;
  elapsedS: number;
  /** From 12 s on (SLOW_S): the slow note shows. */
  slow: boolean;
  /** The probe stream's refusal, or the server's silence, in words. */
  refused: string | null;
  /** When the last probe finished ("14:22:05"). */
  at: string | null;
  source: SourceChips;
  gate: StartFacts['gate'];
  rehearsal: boolean;
  recheck: () => void;
  run: (key: StepKey) => void;
  /** set-setup with a typed group id (the group step's input). */
  setGroup: (groupId: string) => void;
  pending: PendingView | null;
  repo: RepoView;
  stack: StackView;
  chat: ChatView;
  path: Path;
  setPath: (p: Path) => void;
}
