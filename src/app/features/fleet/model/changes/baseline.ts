// The last look, kept per browser (a viewer's convenience, like the door's quality tier): the digest of every project and
// when it was taken. Reading never throws: storage blocked, cleared or holding garbage is no baseline, so no marks.
import type { FleetProject } from '@/lib/demo/types';
import { digestFleet, type Digest } from './diff';

export interface Baseline {
  /** When the look was taken (epoch ms). */
  at: number;
  digests: Readonly<Record<string, Digest>>;
}

/** Where the baseline is kept: localStorage in the browser, anything in a test. Either may throw. */
export interface BaselineStore {
  read(): string | null;
  write(value: string): void;
}

export const BASELINE_KEY = 'belay.fleet.lastLook';

export const browserStore: BaselineStore = {
  read: () => localStorage.getItem(BASELINE_KEY),
  write: (v) => localStorage.setItem(BASELINE_KEY, v),
};

/** This look as the next baseline. */
export const seen = (projects: readonly FleetProject[], at: number): Baseline => ({ at, digests: digestFleet(projects) });

export const encodeBaseline = (projects: readonly FleetProject[], at: number): string => toText(seen(projects, at));

const toText = (b: Baseline): string => JSON.stringify({ v: 1, at: b.at, d: b.digests });

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCountOrNull = (v: unknown) => v === null || isCount(v);

function isDigest(v: unknown): v is Digest {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  const tiers = d.tiers === null || (!!d.tiers && typeof d.tiers === 'object' && Object.values(d.tiers).every(isCount));
  return tiers && isCount(d.needsYou) && isCountOrNull(d.fail) && isCountOrNull(d.demotions) && typeof d.state === 'string';
}

/** The stored text back to a baseline; anything malformed is null. */
export function decodeBaseline(raw: string | null): Baseline | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { v?: unknown; at?: unknown; d?: unknown };
    if (o?.v !== 1 || !isCount(o.at) || !o.d || typeof o.d !== 'object') return null;
    const digests = o.d as Record<string, unknown>;
    return Object.values(digests).every(isDigest) ? { at: o.at, digests: digests as Record<string, Digest> } : null;
  } catch {
    return null;
  }
}

/** The stored text, or null when the store cannot be read. */
export function readRaw(store: BaselineStore): string | null {
  try {
    return store.read();
  } catch {
    return null;
  }
}

export const loadBaseline = (store: BaselineStore): Baseline | null => decodeBaseline(readRaw(store));

/** Keeps a baseline; false when the store refuses it (the marks then last until the page is left). */
export function saveBaseline(store: BaselineStore, b: Baseline): boolean {
  try {
    store.write(toText(b));
    return true;
  } catch {
    return false;
  }
}
