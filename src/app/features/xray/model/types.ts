// The X-ray's data: the parts of a real screen it labels. A part is found in the live DOM by a selector, never drawn
// from a copy, so a label always sits on the control it names.

/** Reads the screen as it is drawn now: the visible text of the first visible match ('' when none). */
export interface ScreenRead {
  text: (selector: string) => string;
  /** How many visible elements match. */
  count: (selector: string) => number;
}

export interface Callout {
  id: string;
  /** CSS selector of the real element; the first visible match is the one labelled. */
  sel: string;
  /** What the part is, in two to four words. */
  title: string;
  /** What it shows now and what to do with it, read off the screen. */
  body: (r: ScreenRead) => string;
  /** The one thing to try: a key or a click. */
  try?: string;
}

/** A screen the X-ray tour visits, in order. */
export interface TourStop {
  key: string;
  href: string;
  label: string;
  callouts: readonly Callout[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
