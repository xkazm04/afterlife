// The film's beats come from the app's loop (DataSource.getLoop), never from the prototype's copy. Each beat key the loop
// names has its own voice (the colour its station, pool and caption take) and its own emblem on the road; a key the
// film does not know takes a voice by position and the plain emblem, so a longer or renamed loop still plays.

/** One beat as the film needs it: what the server sends the client. */
export interface AboutBeat {
  key: string;
  label: string;
  stage: string;
  who: string;
  text: string;
}

/** The data mode as the film's pill says it. */
export interface AboutMode {
  mode: 'demo' | 'live';
  /** The pill's words: the status bar's data label (dataLabel), never "demo" in live. */
  label: string;
  /** Whether the beats themselves are the demo's narrative (always in demo; in live while the loop is illustrative). */
  beatsIllustrative: boolean;
}

export interface AboutData {
  beats: AboutBeat[];
  mode: AboutMode;
}

/** The loop's keys, in the order the film was drawn for. */
export const KNOWN_KEYS = ['finding', 'red', 'patch', 'proof', 'guard', 'gate', 'staging', 'prod', 'summary'] as const;
export type KnownKey = (typeof KNOWN_KEYS)[number];

const VOICE: Record<KnownKey, string> = {
  finding: 'var(--accent)',
  red: 'var(--fail)',
  patch: 'var(--film-gold)',
  proof: 'var(--accent-2)',
  guard: 'var(--tier-supervised)',
  gate: 'var(--ok)',
  staging: 'var(--tier-assisted)',
  prod: 'var(--film-mint)',
  summary: 'var(--film-cream)',
};

export const isKnownKey = (k: string): k is KnownKey => (KNOWN_KEYS as readonly string[]).includes(k);

/** The beat's voice: a CSS colour (a token). */
export function voiceOf(key: string, i: number): string {
  if (isKnownKey(key)) return VOICE[key];
  return VOICE[KNOWN_KEYS[i % KNOWN_KEYS.length]!];
}

/** The caption's kicker: "04 / 09 · stage verify · proof engine (no model)". */
export function kickerOf(b: AboutBeat, i: number, n: number): string {
  return `${pad2(i + 1)} / ${pad2(n)} · stage ${b.stage} · ${b.who}`;
}

/** A beat number as the film writes it: two digits. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
