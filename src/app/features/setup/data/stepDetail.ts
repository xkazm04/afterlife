import type { StepDetail } from './types';

/** What the step commands name: the GitLab host, the group, the target project and the projects step 4 creates. */
export interface StepNames {
  host: string;
  group: string;
  project: string;
  projects: readonly string[];
}

/** The demo's names: its commands, unchanged. */
export const DEMO_NAMES: StepNames = { host: 'gitlab.com', group: 'acme-lab', project: 'ledgerline', projects: ['ledgerline', 'belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine', 'belay-apply'] };

/**
 * A command is shown only if it runs as written: glab's own subcommands and `npx belay doctor`, the one belay command that
 * runs (cli/belay.mjs). Checked against no glab binary or doc page here (glab is not installed): [R?] `variable set`'s
 * `--masked --protected`, and the field names of `protected_branches` and `protected_tags` as the API takes them. Where
 * glab has no flag (a hidden variable, the pipeline-variable role, the job token allowlist) or Belay's CLI does not run the
 * step yet (pair, the flows, the scan, the report), the step says in prose what the agent does and cites its adopt-belay
 * step. They name `n`'s group and project, never the demo's in live mode.
 */
const enc = (n: StepNames, project: string): string => encodeURIComponent(`${n.group}/${project}`);

const details = (n: StepNames): Readonly<Record<number, StepDetail>> => ({
  0: { who: 'agent', does: 'Checks git, glab and node, and that glab is signed in as you.', cmd: ['glab auth status', 'glab api user'], probe: 'glab api user → 200 · signed in as @you' },
  1: { who: 'agent', does: 'Starts Belay on this machine and pairs it with your checkout.', cmd: ['npm install', 'npm run dev'], probe: 'localhost:3000 answering · checkout paired' },
  2: { who: 'agent', does: 'Writes package.yml: group, target, tier ceiling, model route, cloud project, credit cap.', cmd: ['$EDITOR package.yml'], probe: 'package.yml · 8 of 8 answers · ceiling SUPERVISED' },
  3: {
    who: 'human', short: 'Start the Ultimate trial', does: 'Belay cannot accept terms or start a trial for you.', action: 'Start the Ultimate trial',
    where: `GitLab → ${n.group} → Settings → Billing`, note: 'Trial credits last 30 days: start no earlier than needed.',
    before: `trial not detected on ${n.group}`, probe: `Ultimate trial detected on ${n.group}`,
  },
  4: {
    who: 'agent', does: 'Creates the projects under the group. Public, one repository each.', write: true, probe: `${n.projects.length} of ${n.projects.length} projects exist`,
    cmd: n.projects.map((p) => `glab repo create ${p} --group ${n.group} --public`),
  },
  5: {
    who: 'agent', does: `${n === DEMO_NAMES ? 'Pushes the ledgerline demo bank' : `Pushes ${n.project}`} from its own repo, then records the pairing with the pack (adopt-belay step 5; Belay's CLI does not run pair yet).`, write: true, probe: 'remote main = local main · pair recorded',
    cmd: [`git -C ../${n.project} push --mirror https://${n.host}/${n.group}/${n.project}.git`],
  },
  6: {
    who: 'human', short: 'Provision runner and billing', does: "A card and a cloud identity are yours, not an agent's.", action: 'Provision the runner and run the generated script',
    where: `GitLab → ${n.project} → Settings → CI/CD → Runners`, note: 'Tag gitlab--duo, Docker executor.', before: '0 runners with tag gitlab--duo online',
    probe: '1 runner with tag gitlab--duo online · smoke job queued', failFirst: 'still 0 runners with tag gitlab--duo online',
  },
  7: {
    who: 'human', short: 'Run the Cloud Shell IAM script', does: 'Connect Google Cloud without a key, as you.', action: 'Run the IAM integration script in Cloud Shell',
    where: `GitLab → ${n.project} → Settings → Integrations → Google Cloud IAM`, note: 'Review apps for T7 run there.',
    before: 'OIDC test job: no token exchange yet', probe: 'OIDC test job reached Google Cloud without a key',
  },
  8: {
    who: 'human', short: 'Set the tokens yourself', does: 'Belay never sees a value; it reads none of these variables.', action: 'Create the variables on belay-apply, then type the model key at the prompt',
    where: `GitLab → ${n.group}/belay-apply → Settings → CI/CD → Variables`, secret: true,
    note: "On belay-apply only, at project level, never on a target and never a group or instance variable (every target pipeline inherits the group's): BELAY_BOT_TOKEN, BELAY_POLICY_TOKEN, BELAY_DISPATCH_TOKEN and BELAY_LEDGER_TOKEN, each Protect variable on and Masked and hidden (hidden is chosen when the variable is created; glab has no flag for it). Then set Minimum role to use pipeline variables to no_one_allowed, and create one pipeline schedule on main with no variables (Build → Pipeline schedules). gitlab/apply/README.md says what each token is.",
    cmd: ['glab variable set ANTHROPIC_API_KEY --masked --protected'],
    before: 'belay-apply tokens and ANTHROPIC_API_KEY not read', probe: 'ANTHROPIC_API_KEY exists · masked · protected · belay-apply tokens never read',
  },
  9: {
    who: 'agent', does: "Protects main, makes belay/* a protected branch pattern that only Maintainers and the flow accounts can push to (it keeps the agents' branches to the flow accounts; it guards no token), adds CODEOWNERS on CI and policy paths, turns on author-cannot-approve. On belay-apply: main takes no push, merges by Maintainers only, needs Code Owner approval, no force push. Allows belay-apply in the job token allowlists of belay-engine and belay-policy. Protects the v* tags of belay-engine and belay-pack and main of belay-ledger against Developers. The CODEOWNERS and approval-rule changes go in by MR (adopt-belay step 9).",
    write: true, probe: 'read back every setting listed matches',
    cmd: [
      'glab api -X POST projects/:id/protected_branches -f name=main',
      `glab api -X POST projects/${enc(n, 'belay-apply')}/protected_branches -f name=main -f push_access_level=0 -f merge_access_level=40 -f code_owner_approval_required=true -f allow_force_push=false`,
      ...['belay-engine', 'belay-pack'].map((p) => `glab api -X POST projects/${enc(n, p)}/protected_tags -f 'name=v*' -f create_access_level=40`),
      `glab api -X POST projects/${enc(n, 'belay-ledger')}/protected_branches -f name=main -f push_access_level=40 -f merge_access_level=40`,
    ],
  },
  10: {
    who: 'human', short: 'Merge the bootstrap MR !2', does: 'Config applies only from the default branch, so a person merges it.', action: 'Review and merge !2 belay/bootstrap',
    where: `GitLab → ${n.project} → Merge requests → !2`, note: 'Belay never holds a merge token.',
    before: '!2 open · agent-config.yml absent on main', probe: '!2 merged by @you · agent-config.yml on main',
  },
  11: {
    who: 'agent', does: `Enables the flows in ${n.group}/${n.project} by API (adopt-belay step 11; Belay's CLI has no flows command). If the API route is not there, this step comes back to you.`, write: true,
    probe: 'service accounts ai-patcher-…, ai-guardrail-… exist',
  },
  12: {
    who: 'agent', does: 'Runs the first pipeline, then the agent reads its scan and proposes the first gap MR for you to pick (adopt-belay step 12; Belay opens it through its gap door, not a command).', write: true,
    cmd: ['glab ci run'], probe: 'stage grid baseline in the ledger · SBOM job present',
  },
  13: {
    who: 'agent', does: 'Pushes the seeded faults (labelled seeded) and schedules the weekly scan.', write: true, probe: 'schedule exists · seeded branch labelled seeded',
    cmd: ['git push origin demo/seeded-faults', 'glab schedule create --cron "0 3 * * 1" --ref main --description "belay weekly scan"'],
  },
  14: {
    who: 'agent', does: 'Reads the doctor, writes ONBOARDING-REPORT.md by MR and opens the "what only you can do" issue as the hand-back (adopt-belay step 14).', write: true, probe: 'report MR open · hand-back issue open',
    cmd: ['npx belay doctor'],
  },
});

export const STEP_DETAIL: Readonly<Record<number, StepDetail>> = details(DEMO_NAMES);

let last: { key: string; d: Readonly<Record<number, StepDetail>> } | null = null;

/** The step details naming `names`: the demo's own for the demo's names. */
export function stepDetailsFor(names: StepNames): Readonly<Record<number, StepDetail>> {
  const key = JSON.stringify(names);
  if (key === JSON.stringify(DEMO_NAMES)) return STEP_DETAIL;
  if (last?.key !== key) last = { key, d: details(names) };
  return last.d;
}
