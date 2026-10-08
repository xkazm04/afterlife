// The rest of the estate in cycles: five more projects, one per group, armed for T6 after ledgerline (fewer cycles
// each). ILLUSTRATIVE, like belay-demo.json, and written to reconcile with it: replayed from day 0, each history lands
// exactly on the project's fleet rungs today (estate.test.ts holds it). The other 178 projects have no cycle record.
import type { Stage } from '@/schemas/stages';
import type { Cycle, CycleChange, CycleHistory, Verdict } from './cycleTypes';

type Closed = Exclude<Verdict, 'pending' | 'planned'>;

const ch = (mr: string | null, stage: Stage, from: number | null, to: number, verdict: Closed, title: string, why: string, lines?: number): CycleChange => ({
  mr, kind: mr ? 'mr' : verdict === 'regressed' ? 'drift' : 'probe', stage, from, to, title, verdict, why, ...(lines === undefined ? {} : { lines }),
});

const cy = (n: number, theme: string, changes: CycleChange[]): Cycle => ({
  id: `C${n}`, n, theme, state: 'closed', openedDay: (n - 1) * 7, closedDay: n * 7, engine: 'v1', phase: 'credit', changes,
});

const history = (today: number, cycles: Cycle[]): CycleHistory => ({ cycles, today, cadence: 7 });

export const ESTATE_CYCLES: Readonly<Record<string, CycleHistory>> = {
  'ledgerline-web': history(21, [
    cy(1, 'Scanners and a protected main', [
      ch('!12', 'secure', 0, 2, 'credited', 'SAST and secret detection on main', 'pipeline #4410 ran both and produced reports', 11),
      ch('!13', 'create', 1, 2, 'credited', 'Protect main; CODEOWNERS on the CI paths', 'push to main refused in the probe', 6),
    ]),
    cy(2, 'Tests and alerts', [
      ch('!15', 'verify', 1, 2, 'credited', 'JUnit report on every MR pipeline', 'report artifact on 12 MR pipelines', 15),
      ch('!16', 'monitor', 1, 2, 'rejected', 'Alerting config', 'the diff was an empty .gitlab/alerting.yml: detector surface only', 2),
    ]),
    cy(3, 'Ship an image, gate the policy', [
      ch('!18', 'package', 1, 2, 'credited', 'Build an image per release', 'build-image ran; registry tag present', 29),
      ch('!19', 'govern', 1, 2, 'credited', 'Tier gate in the policy pipeline', 'gate ran on the policy MR and wrote its verdict', 38),
    ]),
  ]),
  'statements-api': history(14, [
    cy(1, 'Block what is critical', [
      ch('!31', 'secure', 2, 3, 'credited', 'Scan-result policy blocks critical findings', 'policy block-critical present at the rescan', 17),
      ch('!32', 'release', 2, 3, 'credited', 'Release only from protected tags', 'an unprotected tag push was refused', 5),
    ]),
    cy(2, 'Tests that count', [
      ch('!34', 'verify', 1, 2, 'credited', 'JUnit report on every MR pipeline', 'report artifact on 9 MR pipelines', 14),
      ch('!35', 'create', 0, 1, 'nolift', 'CODEOWNERS on the API paths', 'merged, but no MR exercised it before the rescan: configured, not exercised', 4),
    ]),
  ]),
  'onboarding-cli': history(9, [
    cy(1, 'Gate first', [
      ch('!7', 'govern', 1, 2, 'credited', 'Tier gate in the policy pipeline', 'gate ran on the policy MR and wrote its verdict', 38),
      ch('!8', 'verify', 0, 1, 'nolift', 'A test job', 'the job is configured but never ran on main before the rescan', 12),
    ]),
  ]),
  'runner-pool-ui': history(14, [
    cy(1, 'Proof on every test', [
      ch('!21', 'verify', 3, 4, 'credited', 'Test results re-derived by the engine', 'every MR in 7 days carried a passing proof block', 22),
      ch('!22', 'configure', 2, 3, 'credited', 'Plan must pass before apply', 'a failing plan blocked !22b', 9),
    ]),
    cy(2, 'Hold the line', [
      ch(null, 'secure', 2, 1, 'regressed', 'SAST job dropped from main', 'a rules: change skipped the scanner on main for 6 days'),
      ch('!25', 'govern', 1, 2, 'credited', 'Tier gate in the policy pipeline', 'gate ran on the policy MR and wrote its verdict', 38),
    ]),
  ]),
  'feature-store-worker': history(7, [
    cy(1, 'Make it self-proving', [
      ch('!40', 'monitor', 3, 4, 'credited', 'Alert rules tested in CI', 'a synthetic alert fired and was acknowledged in the pipeline', 31),
      ch('!41', 'plan', 3, 4, 'credited', 'Every gap closes its work item', 'work items #61-#64 closed by the merges that earned them', 8),
    ]),
  ]),
};
