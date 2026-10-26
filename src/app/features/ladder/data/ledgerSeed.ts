// The invented ledger the demo opens with (the prototype's LEDGER). Old moves are policy MRs a person merged; the
// last three are the patch-bump story: guardrail, tripwire, and Afterlife noticing 12 s later. Each move has its instant on
// the demo's clock, labelled in the demo's zone (UTC) as of the moment the demo opens.
import { clockLabel, demoInstant } from '../model/clock';
import type { LedgerEntry } from '../model/types';

const OPEN = new Date(demoInstant(0));
/** `sec` seconds after the demo opens (negative: before), with its label. */
const when = (sec: number): Pick<LedgerEntry, 'at' | 't'> => ({ at: demoInstant(sec), t: clockLabel(demoInstant(sec), 'UTC', OPEN) });
const daysAgo = (d: number) => when(-d * 86_400);

/** A seed entry whose quote is read from the demo task of this merge request. */
export type LedgerSeedEntry = LedgerEntry & { quoteMr?: string };

export const LEDGER_SEED: readonly LedgerSeedEntry[] = [
  { ...daysAgo(11), ids: ['guard.block'], actor: 'a person', where: 'policy MR !27', kind: 'person', text: 'guard.block Supervised → Hands-off' },
  { ...daysAgo(9), ids: ['report.draft'], actor: 'a person', where: 'policy MR !29', kind: 'person', text: 'report.draft Supervised → Hands-off' },
  { ...daysAgo(5), ids: ['dep-bump.patch'], actor: 'a person', where: 'policy MR !33', kind: 'person', text: 'dep-bump.patch Supervised → Hands-off · lease 14 d' },
  { ...daysAgo(3), ids: ['pipeline.retry'], actor: 'a person', where: 'policy MR !35', kind: 'person', text: 'pipeline.retry Supervised → Hands-off · lease 14 d' },
  {
    ...when(-249), ids: ['patch-bump'], actor: 'guardrail job', where: 'GitLab', kind: 'gitlab', chip: 'seeded',
    text: 'high severity on !44: the quoted hunk relaxes a CI rule', quoteMr: '!44',
  },
  {
    ...when(-247), ids: ['patch-bump', 'tier.demote'], actor: 'tripwire job', where: 'GitLab', kind: 'gitlab',
    text: 'commit c3d4 in belay-policy: patch-bump Supervised → Quarantined',
  },
  {
    ...when(-235), ids: ['patch-bump'], actor: 'Afterlife', where: 'next poll', kind: 'afterlife', lag: '+12 s late',
    text: 'sees c3d4; the chip flips. Not in the loop, it only noticed.',
  },
];
