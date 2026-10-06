// The invented ledger the demo opens with (the prototype's LEDGER). Old moves are policy MRs a person merged; the
// last three are the patch-bump story: guardrail, tripwire, and Belay noticing 12 s later.
import type { LedgerEntry } from '../model/types';

/** A seed entry whose quote is read from the demo task of this merge request. */
export type LedgerSeedEntry = LedgerEntry & { quoteMr?: string };

export const LEDGER_SEED: readonly LedgerSeedEntry[] = [
  { t: '11 d ago', ids: ['guard.block'], actor: 'a person', where: 'policy MR !27', kind: 'person', text: 'guard.block Supervised → Hands-off' },
  { t: '9 d ago', ids: ['report.draft'], actor: 'a person', where: 'policy MR !29', kind: 'person', text: 'report.draft Supervised → Hands-off' },
  { t: '5 d ago', ids: ['dep-bump.patch'], actor: 'a person', where: 'policy MR !33', kind: 'person', text: 'dep-bump.patch Supervised → Hands-off · lease 14 d' },
  { t: '3 d ago', ids: ['pipeline.retry'], actor: 'a person', where: 'policy MR !35', kind: 'person', text: 'pipeline.retry Supervised → Hands-off · lease 14 d' },
  {
    t: '14:20:03', ids: ['patch-bump'], actor: 'guardrail job', where: 'GitLab', kind: 'gitlab', chip: 'seeded',
    text: 'high severity on !44: the quoted hunk relaxes a CI rule', quoteMr: '!44',
  },
  {
    t: '14:20:05', ids: ['patch-bump', 'tier.demote'], actor: 'tripwire job', where: 'GitLab', kind: 'gitlab',
    text: 'commit c3d4 in belay-policy: patch-bump Supervised → Quarantined',
  },
  {
    t: '14:20:17', ids: ['patch-bump'], actor: 'Belay', where: 'next poll', kind: 'belay', lag: '+12 s late',
    text: 'sees c3d4; the chip flips. Not in the loop, it only noticed.',
  },
];
