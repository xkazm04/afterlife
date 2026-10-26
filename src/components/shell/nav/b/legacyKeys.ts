// The legacy arm-B host's screens: the Fleet and Needs-you lists, drawn from GET /api/screen/legacy/<key> until W1/W2
// convert them to the screen host (components/shell/host); then the screen host claims the key first and this host
// never sees a click for it. The Director deletes nav/b and the legacy endpoint in W5. Pure.

export const LEGACY_KEYS = ['fleet', 'needs-you'] as const;

export type LegacyKey = (typeof LEGACY_KEYS)[number];

/** The legacy screen an href lands on: /fleet, /fleet/<id>, /needs-you, /needs-you/<id> (query and hash ignored). */
export function legacyKeyOf(href: string): LegacyKey | null {
  const path = href.split(/[?#]/, 1)[0] ?? '';
  const parts = path.split('/');
  if (parts[0] !== '' || parts.length < 2 || parts.length > 3) return null;
  const key = LEGACY_KEYS.find((k) => k === parts[1]);
  if (!key) return null;
  if (parts.length === 3 && parts[2] === '') return null;
  return key;
}
