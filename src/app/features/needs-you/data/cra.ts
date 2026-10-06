import type { ClickCopy } from './types';

export interface Grade {
  name: string;
  why: string;
}
/** Evidence link: what it is, its detail and where to look. All six resolve. */
export interface EvidenceLink {
  what: string;
  detail: string;
  ref: string;
}
const ev = (what: string, detail: string, ref: string): EvidenceLink => ({ what, detail, ref });

/** The packet grades in order. "attested" is deliberately absent: Belay never says it. */
export const GRADES: readonly Grade[] = [
  { name: 'draft', why: 'a link is unresolved' },
  { name: 'reviewable', why: 'every link resolves' },
  { name: 'ready to sign', why: 'a person read it' },
];
export const GRADE_NEVER: Grade = { name: 'attested', why: 'Belay never says this' };

export const EVIDENCE: readonly EvidenceLink[] = [
  ev('release v1.8.0', 'protected tag', 'glab release view'),
  ev('SBOM asset', 'sbom.cdx.json', 'job #9902'),
  ev('vulnerability V-211', 'exploited · seeded', 'vuln report'),
  ev('clock issue #131', 'due date from the clock', 'issue #131'),
  ev('dependency scan', 'same engine as release', 'pipeline #9905'),
  ev('affected versions', 'derived from the SBOM', 'job #9906'),
];

const DRAFT = `EARLY WARNING · DRAFT · written by T2, not legal advice
Product:     ledgerline statements-service, release v1.8.0
Issue:       V-211 in a bundled dependency (seeded: actively exploited)
Aware at:    09:10, the time the exploited label was set
             (a person confirms the start event)
Available in Member States: [a person completes this line]
Exploitation: reported by the seeded feed; no impact seen in
             Belay's data, which is not the same as none
Mitigation:  none shipped yet · tracked in issue #131
Evidence:    6 links, every one resolves (see list)`;

/** n2, the CRA early warning on a 24 h legal clock (a drill on seeded data). */
export const CRA: ClickCopy & {
  openedAt: string;
  issue: string;
  vuln: string;
  release: string;
  awareAt: string;
  dueAt: string;
  dueClock: string;
  remainingSec: number;
  totalSec: number;
  next: readonly (readonly [string, string])[];
  draft: string;
  writeRef: string;
  commands: readonly string[];
  submitCommand: string;
  result: string;
} = {
  openedAt: '13:58',
  issue: '#131',
  vuln: 'V-211',
  release: 'v1.8.0',
  awareAt: '09:10',
  dueAt: 'tomorrow 09:10',
  dueClock: '09:10',
  remainingSec: 19 * 3600 + 12 * 60,
  totalSec: 24 * 3600,
  next: [
    ['72 h notification', 'in 2 d 19 h 12 m'],
    ['Final report', '14 d after a fix exists'],
  ],
  draft: DRAFT,
  writeRef: 'ledgerline#131',
  commands: [
    'glab issue update 131 -R acme-lab/ledgerline --label "cra::ready-to-sign" --unlabel "cra::reviewable"',
    'glab issue note 131 -R acme-lab/ledgerline -m "Read by @operator. Packet is ready to sign. A person submits on ENISA\'s platform."',
  ],
  submitCommand: 'glab issue note 131 -R acme-lab/ledgerline -m "Submitted on ENISA\'s platform by @operator"',
  result: 'Issue #131 labelled cra::ready-to-sign as @operator. The clock keeps running until a person submits.',
  does: ['Marks the packet "ready to sign" on #131, as you', 'Leaves a note that you read it'],
  doesNot: ['submit anything: report.submit is Human only', 'stop or pause the clock', 'call the packet "attested" or "compliant"'],
};
