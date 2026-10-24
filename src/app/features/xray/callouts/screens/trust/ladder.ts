// Ladder: what each action class may do on its own now, the record behind it, and how to take it back. Introduces the
// module, the table's columns and the writes; it does not explain the tier filter, the sort or the name search.
import { numberIn } from '../../../model/dom';
import type { Callout, LegendEntry } from '../../../model/types';
import { STATUS, dataLabelCallout, statusCallout } from '../../shared';

const CLASSES = '[role="treegrid"][aria-label="Action classes"]';
const ROWS = `${CLASSES} [role="row"]:not([data-part])`;
const DOCK = '[data-xray="dock"]';

/** The table's columns as drawn. Names are the headers' own; the unlabelled last column uses its tooltip. */
const COLUMNS: readonly LegendEntry[] = [
  { name: 'Class', means: 'One action class (a kind of write an agent makes), under the track that owns it. Its name opens the class page.' },
  {
    name: 'Tier',
    means: 'What the class may do now, letter plus colour: H Hands-off (green, acts alone), S Supervised (violet, a person approves the outcome), A Assisted (blue, a person triggers each step), Q Quarantined (rose, read and comment only), P Human only (no agent).',
  },
  { name: 'Ceiling', means: 'The highest tier the policy allows this class; the bar shows where the tier sits inside it (≤ H, ≤ S ...).' },
  { name: 'Lease', means: 'Days left on a time-boxed grant; — when the class holds no lease.' },
  { name: 'Acc', means: 'Accepted outputs against the number the next tier needs (16 /15 meets it).' },
  { name: 'No-edit', means: 'Share of its MRs merged without a human edit.' },
  { name: 'Rv', means: 'Reverts: outputs a person had to undo.' },
  { name: 'Clean · 14 d', means: 'Clean days of the last 14: days with no revert against the class; the strip marks each one.' },
  { name: 'Last move', means: 'The latest ledger entry for the class: a promotion, a revoke, a tripwire. A track row shows the last tier the gate saw.' },
  { name: 'Act', means: 'The write this class offers: Revoke, Promote or Re-admit; "never an agent" on Human only.' },
];

export const LADDER: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Ladder',
    body: (r) => {
      const classes = numberIn(r.text(STATUS), 'every');
      const tracks = r.count(`${CLASSES} [data-part="group-row"]`);
      return `What may each agent do on its own now, and what record backs it? ${classes} action classes${tracks ? ` under ${tracks} tracks` : ''}, one row each: its tier, the record that would earn the next one, and the write that takes it back.`;
    },
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${CLASSES} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'A track row (T1 to T8) heads the classes its agent owns. A — is no record yet, never counted as zero; the record columns are what trust-policy.yml judges a promotion on.',
    legend: COLUMNS,
  },
  {
    id: 'open',
    kind: 'activity',
    sel: `${ROWS} a[href^="/ladder/"]`,
    title: 'Open a class',
    body: () => 'The class page lays out the promotion rule as counts, the exact write behind r and p, where a revoke was enforced, and every move by who made it.',
    try: 'j k then Enter',
  },
  {
    id: 'revoke',
    kind: 'activity',
    sel: `${ROWS} button[aria-label^="Revoke to"]`,
    title: 'Take autonomy back',
    body: () => 'Revoke lowers the class one tier (r); q drops it straight to Quarantined, ▾ picks any lower tier. It is a commit to belay-policy as you, sent only on your click; live, it reads Pending read until a gated MR confirms it (the demo simulates that read).',
    try: 'r on a selected row',
  },
  {
    id: 'promote',
    kind: 'activity',
    sel: `${ROWS} button[aria-disabled]`,
    title: 'Grant the next tier',
    body: () => 'Promote stays greyed until the record meets every rule. When it does, p sends the policy MR the server planned, on your confirmed click; a person merges it in GitLab, Belay never does.',
  },
  {
    id: 'dock',
    kind: 'activity',
    sel: DOCK,
    title: 'The write, before it runs',
    body: (r) => {
      const line = r.text(DOCK);
      return `${line ? `"${line.slice(0, 90)}${line.length > 90 ? '…' : ''}". ` : ''}The exact command the selected row's key would send, shown before you press it; hover it for the whole command.`;
    },
  },
  statusCallout('Where the tiers come from', 'Classes shown, and the tier-state.yml commit and poll every tier on this screen is read from.'),
  dataLabelCallout,
  {
    id: 'help',
    kind: 'shell',
    sel: `${DOCK} button[aria-label="Keys and legend"]`,
    title: 'Legend and keys',
    body: () => 'The tier legend and every key of this screen (j k, r, q, p, 0 to 5, /) sit behind this ?.',
    try: 'Click ?',
  },
];
