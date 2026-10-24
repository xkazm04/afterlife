// Task: one agent task cross-examined against its proof. Introduces the module, how to read the court and the receipt
// chain, and what to do; not the verdict filter or the proof-class menu.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { HELP, STATUS, dataLabelCallout, helpCallout, statusCallout } from '../../shared';

const VERDICT = 'section[role="group"][aria-label="Verdict"]';
const COURT = 'section[aria-label="Claims tested by checks"]';
const CHAIN = 'ol[aria-label="Receipt chain"]';
const DOCKET = 'nav[aria-label="Tasks"]';

/** The verdict word as the equation draws it (PASS, FAIL, INCONCLUSIVE, UNKNOWN). */
const verdictOf = (r: ScreenRead): string => r.text(VERDICT).split(' ')[0] || 'its verdict';

/** The court: two columns joined by ties. */
const COURT_LEGEND: readonly LegendEntry[] = [
  {
    name: 'Claims',
    means: 'What the agent says it did, in its own words: untrusted text, never a term of the verdict. Each says upheld, contradicted, open, or "no weight" when no check tests it.',
  },
  {
    name: 'Checks',
    means: 'What the proof engine tested, with the GitLab object it read and its chain link. ✓ holds, ✗ fails, ? unknown. A struck check waits for a person and is never a pass. "invariant" is checked on every task of the class.',
  },
  {
    name: 'Ties',
    means: 'The lines between them: green, the check holds for the claim; red, it contradicts it; dashed, unknown. A claim with no tie gets a dashed "?".',
  },
];

/** The receipt chain: seven links, each a GitLab object. */
const CHAIN_LEGEND: readonly LegendEntry[] = [
  { name: '1 Event', means: 'What started the task: a finding, a pipeline, an MR or a person’s pick.' },
  { name: '2 Route', means: 'The flow that took it and the tier it read, at a policy commit.' },
  { name: '3 Act', means: 'The agent’s job: what it ran and changed.' },
  { name: '4 Prove', means: 'The proof engine’s job, which runs no model.' },
  { name: '5 Decide', means: 'The guardrail and the merge request’s gate.' },
  { name: '6 Deploy', means: 'Where it shipped.' },
  { name: '7 Record', means: 'The ledger row that keeps it. A dashed n/a link was not reached: nothing shipped.' },
];

export const TASK: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Task',
    body: (r) => {
      const title = r.text('main h1');
      return `Does this agent task’s proof hold up, check by check, against what the agent claimed? ${title ? `"${title}" reads` : 'It reads'} ${verdictOf(r)}, derived from the engine’s checks only, never from the agent’s words. The sidebar’s docket holds ${r.count(`${DOCKET} a`) || 'the'} tasks; [ and ] step through them, and nothing here writes.`;
    },
  },
  {
    id: 'court',
    kind: 'columns',
    sel: COURT,
    title: 'Claims against checks',
    body: (r) =>
      `${r.count(`${COURT} [aria-label="Claims"] [role="button"]`)} claims on the left, ${r.count(`${COURT} [aria-label="Checks"] button[aria-label]`)} checks on the right; a tie says what each check makes of a claim. A term is never colour alone: each carries its mark.`,
    legend: COURT_LEGEND,
  },
  {
    id: 'chain',
    kind: 'columns',
    sel: CHAIN,
    title: 'The receipt chain',
    body: () => 'Seven links from the event to the ledger, each a GitLab object you can open. The link the selected check read is lit.',
    legend: CHAIN_LEGEND,
  },
  {
    id: 'term',
    kind: 'activity',
    sel: `${VERDICT} button:not([data-xray])`,
    title: 'Read the verdict',
    body: (r) =>
      `${verdictOf(r)} = every check, joined by ∧. Click a term to select its check: the inspector shows its ruling, the Proof Block and the evidence it read. On a fail, the line under it names the deciding checks.`,
    try: 'n walks the deciding checks',
  },
  {
    id: 'claim',
    kind: 'activity',
    sel: `${COURT} [aria-label="Claims"] [role="button"]`,
    title: 'Cross-examine a claim',
    body: () => 'Select a claim to light the checks that test it. Arrow keys walk a column and cross along a tie; the selection is kept in the URL, so a link opens on it.',
    try: '↑ ↓ walk · ← → cross',
  },
  {
    id: 'replay',
    kind: 'activity',
    sel: 'button[title^="Replay from ledger"]',
    title: 'Replay from the ledger',
    body: () => 'Re-derives the verdict from the ledger rows, one check at a time, and says whether the hash chain holds. It never re-runs the agent.',
    try: 'r',
  },
  statusCallout('The docket in one line', 'Tasks, fails, how fresh the ledger read is; it ends "reads only".'),
  dataLabelCallout,
  // The equation carries its own "?" (data-xray="help") before the status bar's, so this one is scoped to the bar.
  { ...helpCallout, sel: `${STATUS} ~ ${HELP}` },
];
