import { CAP_SHORT } from '../data/capabilities';
import { LIVE_CAP_LABELS } from '../data/live/liveCapabilities';
import type { Focus } from './types';

/** URL-safe slug of a capability name: "Pipelines, MRs, releases" -> "pipelines-mrs-releases". */
export const capSlug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The segment of /setup/[node]: step-<n>, track-<id>, cap-<slug>. */
export function nodeKey(f: Focus): string {
  return f.k === 'cap' ? `cap-${capSlug(f.id)}` : `${f.k}-${f.id}`;
}

export const nodeHref = (f: Focus): string => `/setup/${nodeKey(f)}`;

/** What the unlock map holds: the catalogue's step numbers, track ids and capability names. */
export interface NodeUniverse {
  steps: readonly number[];
  tracks: readonly string[];
  caps: readonly string[];
}

/** The node a /setup/[node] segment names, or null when it names none of the universe's. */
export function parseNodeKey(key: string, u: NodeUniverse): Focus | null {
  const m = /^(step|track|cap)-(.+)$/.exec(key);
  if (!m) return null;
  const [, k, rest = ''] = m;
  if (k === 'step') {
    // Only the segment nodeKey writes: step-014 is not a second address for step 14.
    const n = /^(0|[1-9]\d*)$/.test(rest) ? Number(rest) : -1;
    return u.steps.includes(n) ? { k: 'step', id: n } : null;
  }
  if (k === 'track') return u.tracks.includes(rest) ? { k: 'track', id: rest } : null;
  const cap = u.caps.find((c) => capSlug(c) === rest);
  return cap ? { k: 'cap', id: cap } : null;
}

/**
 * The universe a /setup/<node> may name: the catalogue's steps and tracks, and the capability names the map renders
 * (the doctor's own labels in live mode, the demo's names otherwise). Pure: the server's notFound and the
 * screen's own check resolve against the same.
 */
export const universeOf = (steps: readonly number[], tracks: readonly string[], live: boolean): NodeUniverse => ({
  steps,
  tracks,
  caps: live ? LIVE_CAP_LABELS : Object.keys(CAP_SHORT),
});
