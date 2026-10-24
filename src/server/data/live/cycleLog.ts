// What a poll cycle said without throwing: the group read's error, the cycle's warnings, a policy the screens cannot
// show, each project's error and issues.
// The runtime logs one `belay:` line when that set differs from the last cycle's, so a standing problem is named once,
// when it starts and when it clears, not every poll interval.
import type { CycleResult } from '@/server/poller';
import { rulesOf } from '../policy';

/** Every problem the cycle reported, each once, in the cycle's order. */
export function cycleProblems(r: CycleResult): string[] {
  const out = r.error !== undefined ? [`group: ${r.error}`] : [];
  out.push(...r.warnings);
  // The engine accepted it, but the screens need every threshold rulesOf reads: without one they show none.
  if (r.policy && rulesOf(r.policy) === null) out.push('policy: trust-policy.yml lacks a promotion threshold, cooldown_days or envelope.hands_off; the screens show no thresholds');
  for (const p of r.projects) {
    if (!p.ok) out.push(`${p.id}: ${p.error ?? 'poll failed'}`);
    out.push(...p.issues.map((i) => `${p.id}: ${i}`));
  }
  return [...new Set(out)];
}

/** The line naming what changed since `prev` (null: no cycle before, so every problem is new), or null when nothing did. */
export function cycleLine(prev: readonly string[] | null, next: readonly string[]): string | null {
  const before = new Set(prev ?? []);
  const after = new Set(next);
  const added = next.filter((x) => !before.has(x));
  const cleared = [...before].filter((x) => !after.has(x));
  if (added.length === 0 && cleared.length === 0) return null;
  const parts = [
    added.length ? `${added.length} new: ${added.join('; ')}` : '',
    cleared.length ? `${cleared.length} cleared: ${cleared.join('; ')}` : '',
  ].filter(Boolean);
  return `belay: poll cycle ${parts.join('. ')} (${next.length} standing)`;
}
