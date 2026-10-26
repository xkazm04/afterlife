// The engine's model-free checkout scan (engine/scan, what `afterlife scan <checkout>` prints) as plan evidence: every
// stage it rated R0 (absent) or could not rate (unknown), each with the scan's own why. Read-only, no network.
import { checkoutFacts } from '../../engine/scan/local';
import { scan } from '../../engine/scan/scan';
import type { Idea } from './types';

export function checkoutScanIdeas(checkout: string, at = new Date()): Idea[] {
  return scan(checkoutFacts(checkout), at)
    .cells.filter((c) => c.rung === null || c.rung === 0)
    .map((c) => ({ source: 'scan' as const, ref: c.stage, tags: [c.rung === null ? 'unknown' : 'R0 absent'], title: `${c.stage} stage`, detail: c.why.replace(/\s+/g, ' ').trim() }));
}
