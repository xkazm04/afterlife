// The guide's path through the app, in the order a person meets it: bring projects in, watch them, govern what the
// agents may do and decide what waits, then improve the projects. The chapters are the sidebar's groups, so the tour
// teaches where things live. Each step names the real screen it plays on, the element it lights and what the layer does.
import { NAV_GROUPS, type NavGroup } from '@/components/shell/sidebar/navItems';
import { GOVERN } from './story/govern';
import { IMPROVE } from './story/improve';
import { START } from './story/start';
import { WATCH } from './story/watch';

/** A real element on the screen, found in the live DOM: the first drawn match of `sel`, narrowed by its text. */
export interface Target {
  sel: string;
  /** Only a match whose text contains this. */
  text?: string;
  /** Light the match's parent instead (a pair of buttons lit as one). */
  parent?: boolean;
}

/** What the layer does once the step's screen is drawn: open a tab, start the screen's own replay, or play the tripwire. */
export type Effect = { kind: 'tab'; tab: 'court' | 'chain' } | { kind: 'replay' } | { kind: 'tripwire' };

/** The rail's light for a step: the chapter's own, the pink of something going wrong, or amber where it is yours. */
export type Tone = 'wrong' | 'you';

export interface Step {
  key: string;
  /** The rail's label. */
  label: string;
  chapter: NavGroup['key'];
  tone?: Tone;
  /** The module or idea this step introduces, shown as the caption's chip; null for the recap. */
  concept: string | null;
  caption: string;
  /** The real screen the step plays on. */
  href: string;
  target: Target | null;
  effects?: readonly Effect[];
  /** The ghost cursor points at the target: here the person acts. */
  cursor?: boolean;
  /** Autoplay stops here: the step waits for the person. */
  hold?: boolean;
}

const RECAP: Step = {
  key: 'recap',
  label: 'Recap',
  chapter: 'improve',
  concept: null,
  caption: 'That is the whole path. Every screen sits in the sidebar under the same four groups.',
  href: '/runs',
  target: null,
  hold: true,
};

export const STEPS: readonly Step[] = [...START, ...WATCH, ...GOVERN, ...IMPROVE, RECAP];

export interface Chapter {
  key: NavGroup['key'];
  label: string;
  line: string;
  /** The chapter's first step, and how many steps it spans on the rail. */
  first: number;
  steps: number;
}

/** The chapters in order: the sidebar's groups, each with where it starts on the rail. */
export const CHAPTERS: readonly Chapter[] = NAV_GROUPS.map((g) => ({
  key: g.key,
  label: g.label,
  line: g.line,
  first: STEPS.findIndex((s) => s.chapter === g.key),
  steps: STEPS.filter((s) => s.chapter === g.key).length,
}));

/** The step index of a key; -1 when the story has no such step. */
export const stepIndex = (key: string): number => STEPS.findIndex((s) => s.key === key);
