// The client's read of GET /api/screen/<key>: one sample screen's props as its page passes them (arms B and C draw the
// screen from them). Never cached by the browser: the arms decide what is stale. The wire's arrays are revived to the
// page's Sets by shell-arms/model/wire.ts (pure; the server loaders are a type-only import).
import type { ScreenProps } from '@/app/features/shell-arms/data/screenProps';
import { fromWire, type ScreenWire } from '@/app/features/shell-arms/model/wire';
import type { ArmScreenKey } from './navArm';

/** What the endpoint answers. Absent values are omitted keys, never null or 0 stand-ins. */
export interface ScreenEnvelope<K extends ArmScreenKey = ArmScreenKey> {
  key: K;
  /** When the server read the props (ISO). */
  asOf: string;
  props: ScreenProps[K];
}

/** A non-2xx answer: 404 for an unknown key, 503 live before the first poll (its reason) or on any other failure. */
export class ScreenReadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/**
 * The screen's props for `search` (a location.search, with or without its `?`, passed through: fleet decodes its list
 * state from it). Rejects with ScreenReadError on a non-2xx answer; `signal` aborts a superseded read.
 */
export async function readScreen<K extends ArmScreenKey>(key: K, search = '', signal?: AbortSignal): Promise<ScreenEnvelope<K>> {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const res = await fetch(`/api/screen/${encodeURIComponent(key)}${q ? `?${q}` : ''}`, { cache: 'no-store', signal });
  if (!res.ok) {
    let reason = `screen ${key}: ${res.status}`;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') reason = body.error;
    } catch {
      // no JSON body: the status says enough
    }
    throw new ScreenReadError(res.status, reason);
  }
  const body = (await res.json()) as Omit<ScreenEnvelope<K>, 'props'> & { props: ScreenWire[K] };
  return { ...body, props: fromWire(key, body.props) };
}
