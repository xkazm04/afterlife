// Which promotion `p` would send for a class, if any, and how the screen names each write. The promotion rule
// (promotion() in src/lib/promotion) decides: eligible goes one rung up; a real quarantine is re-admitted at Assisted,
// never at its old tier. Anything else asks the server for nothing, and Promote stays grey with the rule's reason.
import type { HumanKeyRead, Promotion } from '@/lib/promotion';
import type { PromoteView } from '../../write/promote';
import type { ClassRow, Tier } from '../types';

/** The tier p takes a class to: the rule's next rung when eligible, Assisted for a quarantine, else null. */
export function promoteTarget(p: Promotion): Tier | null {
  if (p.kind === 'eligible') return p.next;
  if (p.kind === 'readmit') return 'assisted';
  return null;
}

export interface PromoteAsk {
  id: string;
  to: Tier;
  /** A re-admission (quarantined -> Assisted), not a promotion. */
  readmit: boolean;
  /** The live promotion ask in Needs you this settles; absent when none is open (a settled one never reopens it). */
  proposal?: string;
}

/** The promotion to ask the server for when `c` is in view, or null (not eligible, not quarantined: nothing is asked). */
export function promoteAsk(c: ClassRow, p: Promotion): PromoteAsk | null {
  const to = promoteTarget(p);
  if (!to) return null;
  const proposal = p.kind === 'eligible' && c.ask && c.ask.to === to ? c.ask.id : undefined;
  return { id: c.id, to, readmit: p.kind === 'readmit', ...(proposal ? { proposal } : {}) };
}

/** Which write a confirm runs, said before the commands: the key, what it is, and who finishes it. */
export const WRITE_HEAD = {
  revoke: 'Revoke · direct commit',
  promote: 'Promote · policy MR a person merges',
  readmit: 'Re-admit · policy MR a person merges',
} as const;

export type SentView = Extract<PromoteView, { kind: 'sent' }>;

/** What the screen says once the server answered done: the MR GitLab opened, or that the demo only simulated it. */
export function sentWords(v: SentView): string {
  if (v.simulated) return 'Simulated · demo mode: no MR was opened, nothing was sent to GitLab';
  return v.mr ? `Opened ${v.mr} · a person merges it in GitLab; Afterlife never does` : 'MR opened · GitLab named none';
}

/** The precondition's read-back, under the promotion rule: verified where, failed naming each missing setting, or not read. */
export function humanKeyLine(k: HumanKeyRead): string {
  if (k.state === 'verified') return `Human key verified on ${k.where ?? 'belay-policy'}`;
  if (k.state === 'failed') return `Human key failed: ${k.missing.join('; ')}${k.why ? ` · not read: ${k.why}` : ''}`;
  return `Human key not read: ${k.why ?? 'GitLab gave no reason'}`;
}

/**
 * The one line the promote preview adds when the key failed: the MR is still opened (the server decides the write, and
 * Afterlife never merges), but GitLab would not hold its merge for a person. Null otherwise.
 */
export function humanKeyWarning(k: HumanKeyRead | undefined): string | null {
  if (k?.state !== 'failed') return null;
  return `The human key is not in place (${k.missing.join('; ')}): GitLab does not hold this MR for a person's merge.`;
}
