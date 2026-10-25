// A probe result the save step can trust. The checklist streams one probe per request and the save comes back with the
// results, so the server seals each result it produced (an HMAC under a key that lives only in this process) and the
// save keeps only results whose seal holds: a client cannot hand in an `ok` no probe returned. A server restart
// voids the seals, and the wizard then probes again.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ProbeResult } from '@/schemas/vitals';
import { rootKey } from '../repos/git';

// On globalThis: Next may load this module once per route bundle, and the probe and save routes must share one key.
const g = globalThis as { __belayProbeSealKey?: Buffer };
const KEY = (g.__belayProbeSealKey ??= randomBytes(32));

/** Stable JSON: keys sorted at every level, so the same result always seals the same. */
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]`
    : typeof v === 'object' && v !== null ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(v);

export function sealOf(result: ProbeResult, root: string): string {
  return createHmac('sha256', KEY).update(rootKey(root)).update('\n').update(stable(result)).digest('hex');
}

export interface Sealed {
  result: ProbeResult;
  seal: string;
}

export function verifySeal(s: unknown, root: string): s is Sealed {
  if (typeof s !== 'object' || s === null) return false;
  const { result, seal } = s as { result?: unknown; seal?: unknown };
  if (typeof seal !== 'string' || !/^[0-9a-f]{64}$/.test(seal) || typeof result !== 'object' || result === null) return false;
  const want = Buffer.from(sealOf(result as ProbeResult, root), 'hex');
  return timingSafeEqual(want, Buffer.from(seal, 'hex'));
}
