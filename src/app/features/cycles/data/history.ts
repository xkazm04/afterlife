// The closed cycles of acme-lab/ledgerline, day 0 to the 14:02 scan. ILLUSTRATIVE, like the shared demo dataset, and
// written to reconcile with it: replayed from the day-0 rungs these six cycles land exactly on the 14:02 rungs (a test
// holds it), and every Maturity credit-history entry (!17 to !23) is a change here. Same engine throughout.
import type { Cycle } from '../model/types';

const ENGINE = 'v1';

export const CLOSED_CYCLES: readonly Cycle[] = [
  {
    id: 'C1', n: 1, theme: 'Baseline and guard rails', state: 'closed', openedDay: 0, closedDay: 7, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!8', kind: 'mr', stage: 'govern', from: 0, to: 1, title: 'Bootstrap belay-policy: a tier record per class', verdict: 'credited', why: 'tier-state.yml on main, read by the poller', lines: 64 },
      { mr: '!9', kind: 'mr', stage: 'create', from: 1, to: 2, title: 'Protect main; CODEOWNERS on CI paths', verdict: 'credited', why: 'push to main refused in the probe; approval rule exercised on !10', lines: 9 },
      { mr: null, kind: 'probe', stage: 'monitor', from: null, to: 1, title: 'Probe for an alert integration', verdict: 'resolved', why: 'alert endpoint integration exists; never fired, so R1 only' },
    ],
  },
  {
    id: 'C2', n: 2, theme: 'Make tests count', state: 'closed', openedDay: 7, closedDay: 14, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!11', kind: 'mr', stage: 'verify', from: 1, to: 2, title: 'JUnit report on every MR pipeline', verdict: 'credited', why: 'report artifact on 31 MR pipelines in 14 days', lines: 18 },
      { mr: '!12', kind: 'mr', stage: 'govern', from: 1, to: 2, title: 'Tier gate job in the policy pipeline', verdict: 'credited', why: 'gate ran on the policy MR and wrote its verdict', lines: 41 },
      { mr: '!13', kind: 'mr', stage: 'plan', from: 0, to: 1, title: 'Open a work item per maturity gap', verdict: 'nolift', why: 'template merged, but no work item was opened before the rescan: configured, not exercised', lines: 22 },
    ],
  },
  {
    id: 'C3', n: 3, theme: 'Gates that block', state: 'closed', openedDay: 14, closedDay: 21, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!14', kind: 'mr', stage: 'govern', from: 2, to: 3, title: 'Failing tier gate blocks the policy merge', verdict: 'credited', why: 'a red gate held !14b; audit events present', lines: 12 },
      { mr: '!15', kind: 'mr', stage: 'plan', from: 0, to: 1, title: 'Gap work items, carried from C2', verdict: 'credited', why: 'work items #120 and #121 opened by the autopilot', lines: 3 },
      { mr: '!16', kind: 'mr', stage: 'verify', from: 2, to: 3, title: 'Red JUnit blocks the merge', verdict: 'credited', why: 'merge refused on !16b with a failing test', lines: 7 },
    ],
  },
  {
    id: 'C4', n: 4, theme: 'Scanners and images', state: 'closed', openedDay: 21, closedDay: 28, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!17', kind: 'mr', stage: 'secure', from: 0, to: 2, title: 'SAST, secrets and dependency scanning on main', verdict: 'credited', why: 'credited only after pipeline #9812 ran and produced reports', lines: 14 },
      { mr: '!19', kind: 'mr', stage: 'package', from: 0, to: 2, title: 'Build an image per release', verdict: 'credited', why: 'build-image ran; registry tag present', lines: 37 },
      { mr: null, kind: 'drift', stage: 'verify', from: 3, to: 2, title: 'JUnit job skipped on main', verdict: 'regressed', why: 'a rules: change skipped the test job on main for 15 days; nothing blocked a merge' },
    ],
  },
  {
    id: 'C5', n: 5, theme: 'Ship it on the record', state: 'closed', openedDay: 28, closedDay: 35, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!18', kind: 'mr', stage: 'verify', from: 2, to: 3, title: 'Restore the test job on main', verdict: 'credited', why: 'the C4 regression: job ran on main again and blocked !18b', lines: 4 },
      { mr: '!20', kind: 'mr', stage: 'release', from: 0, to: 2, title: 'Release from a protected tag with an SBOM', verdict: 'credited', why: 'release v0.4.2 cut by the job, SBOM asset attached', lines: 46 },
      { mr: '!21', kind: 'mr', stage: 'monitor', from: 1, to: 2, title: 'Alerting config', verdict: 'rejected', why: 'whole diff was an empty .gitlab/alerting.yml: detector surface only', lines: 2 },
      { mr: '!22', kind: 'mr', stage: 'configure', from: 0, to: 2, title: 'Cloud Run as IaC with managed state', verdict: 'credited', why: 'state written by a pipeline; deployment recorded', lines: 88 },
    ],
  },
  {
    id: 'C6', n: 6, theme: 'Block the critical', state: 'closed', openedDay: 35, closedDay: 42, engine: ENGINE, phase: 'credit',
    changes: [
      { mr: '!23', kind: 'mr', stage: 'secure', from: 2, to: 3, title: 'Scan-result policy blocks critical findings', verdict: 'credited', why: 'policy block-critical present at the 14:02 scan', lines: 19 },
    ],
  },
];

/** Today, in days since onboarding: C6 closed at this morning's 14:02 scan. */
export const TODAY = 42;
/** A cycle is a week: the weekly rescan closes it. */
export const CADENCE_DAYS = 7;
