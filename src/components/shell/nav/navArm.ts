// The tab-switch bake-off's arm: which of three ways the sidebar moves between the sample modules (Fleet, Monitor, Needs
// you). A = real Next routes made instant, B = a client host renders the screens from JSON, C = a client copy swaps in
// while the real route loads underneath. Pure: the hook that picks one at runtime is useNavArm.ts.

export type NavArm = 'A' | 'B' | 'C';

/** The localStorage key the chosen arm is remembered under (listed on the About page). */
export const NAV_ARM_KEY = 'belay.navArm';

/** The modules the arms compete on; every other sidebar tab stays a plain Link. */
export const ARM_SAMPLE_KEYS = ['fleet', 'monitor', 'needs-you'] as const;

export type ArmScreenKey = (typeof ARM_SAMPLE_KEYS)[number];

/** `?arm=` (any case, surrounding spaces ignored) as an arm, or null when it names none. */
export function parseArm(raw: string | null | undefined): NavArm | null {
  const v = raw?.trim().toUpperCase();
  return v === 'A' || v === 'B' || v === 'C' ? v : null;
}

/** The sample module an href lands on: /fleet, /fleet/<id>, /monitor, /needs-you, /needs-you/<id> (query and hash ignored). */
export function sampleKeyOf(href: string): ArmScreenKey | null {
  const path = href.split(/[?#]/, 1)[0] ?? '';
  const parts = path.split('/');
  if (parts[0] !== '' || parts.length < 2 || parts.length > 3) return null;
  const key = ARM_SAMPLE_KEYS.find((k) => k === parts[1]);
  if (!key) return null;
  if (parts.length === 3 && (parts[2] === '' || key === 'monitor')) return null;
  return key;
}

/** True when the href is one of the sample modules' screens. */
export function isSampleHref(href: string): boolean {
  return sampleKeyOf(href) !== null;
}
