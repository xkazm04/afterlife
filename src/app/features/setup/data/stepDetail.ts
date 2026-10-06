import type { StepDetail } from './types';

/** Commands are illustrative: glab flags recalled, not sourced. */
export const STEP_DETAIL: Readonly<Record<number, StepDetail>> = {
  0: { who: 'agent', does: 'Checks git, glab and node, and that glab is signed in as you.', cmd: ['glab auth status', 'glab api user'], probe: 'glab api user → 200 · signed in as @you' },
  1: { who: 'agent', does: 'Starts Belay on this machine and pairs it with your checkout.', cmd: ['npm install', 'npm run dev'], probe: 'localhost:3000 answering · checkout paired' },
  2: { who: 'agent', does: 'Writes package.yml: group, target, tier ceiling, model route, cloud project, credit cap.', cmd: ['$EDITOR package.yml'], probe: 'package.yml · 8 of 8 answers · ceiling SUPERVISED' },
  3: {
    who: 'human', short: 'Start the Ultimate trial', does: 'Belay cannot accept terms or start a trial for you.', action: 'Start the Ultimate trial',
    where: 'GitLab → acme-lab → Settings → Billing', note: 'Trial credits last 30 days: start no earlier than needed.',
    before: 'trial not detected on acme-lab', probe: 'Ultimate trial detected on acme-lab',
  },
  4: {
    who: 'agent', does: 'Creates the projects under the group. Public, one repository each.', write: true, probe: '4 of 4 projects exist',
    cmd: ['glab repo create ledgerline --group acme-lab --public', 'glab repo create belay-pack --group acme-lab --public', 'glab repo create belay-policy --group acme-lab --public', 'glab repo create belay-ledger --group acme-lab --public'],
  },
  5: {
    who: 'agent', does: 'Pushes the ledgerline demo bank from its own repo and pairs it with the pack.', write: true, probe: 'remote main = local main · pair recorded',
    cmd: ['git -C ../ledgerline push --mirror https://gitlab.com/acme-lab/ledgerline.git', 'npx belay pair ../ledgerline ../belay-pack'],
  },
  6: {
    who: 'human', short: 'Provision runner and billing', does: "A card and a cloud identity are yours, not an agent's.", action: 'Provision the runner and run the generated script',
    where: 'GitLab → ledgerline → Settings → CI/CD → Runners', note: 'Tag gitlab--duo, Docker executor.', before: '0 runners with tag gitlab--duo online',
    probe: '1 runner with tag gitlab--duo online · smoke job queued', failFirst: 'still 0 runners with tag gitlab--duo online',
  },
  7: {
    who: 'human', short: 'Run the Cloud Shell IAM script', does: 'Connect Google Cloud without a key, as you.', action: 'Run the IAM integration script in Cloud Shell',
    where: 'GitLab → ledgerline → Settings → Integrations → Google Cloud IAM', note: 'Review apps for T7 run there.',
    before: 'OIDC test job: no token exchange yet', probe: 'OIDC test job reached Google Cloud without a key',
  },
  8: {
    who: 'human', short: 'Type the model key yourself', does: 'Belay never sees the value; it checks only that the variable exists.', action: 'Run this and type the value at the prompt',
    where: 'your terminal', secret: true, cmd: ['glab variable set ANTHROPIC_API_KEY --masked --protected'],
    before: 'ANTHROPIC_API_KEY not present', probe: 'ANTHROPIC_API_KEY exists · masked · protected · value never read',
  },
  9: {
    who: 'agent', does: 'Protects main, adds CODEOWNERS on CI and policy paths, turns on author-cannot-approve.', write: true, probe: 'read back 4 of 4 settings match',
    cmd: ['glab api -X POST projects/:id/protected_branches -f name=main', 'glab api -X POST projects/:id/approval_rules …', 'git commit CODEOWNERS && glab mr create --fill'],
  },
  10: {
    who: 'human', short: 'Merge the bootstrap MR !2', does: 'Config applies only from the default branch, so a person merges it.', action: 'Review and merge !2 belay/bootstrap',
    where: 'GitLab → ledgerline → Merge requests → !2', note: 'Belay never holds a merge token.',
    before: '!2 open · agent-config.yml absent on main', probe: '!2 merged by @you · agent-config.yml on main',
  },
  11: {
    who: 'agent', does: 'Enables the flows by API. If the API route is not there, this step comes back to you.', write: true,
    cmd: ['npx belay flows enable --project acme-lab/ledgerline'], probe: 'service accounts ai-patcher-…, ai-guardrail-… exist',
  },
  12: {
    who: 'agent', does: 'Runs the first pipeline and scan, then proposes the first gap MR for you to pick.', write: true,
    cmd: ['glab ci run', 'npx belay scan --propose'], probe: 'stage grid baseline in the ledger · SBOM job present',
  },
  13: {
    who: 'agent', does: 'Pushes the seeded faults (labelled seeded) and schedules the weekly scan.', write: true, probe: 'schedule exists · seeded branch labelled seeded',
    cmd: ['git push origin demo/seeded-faults', 'glab schedule create --cron "0 3 * * 1" --ref main --description "belay weekly scan"'],
  },
  14: {
    who: 'agent', does: 'Writes ONBOARDING-REPORT.md by MR and opens the "what only you can do" issue.', write: true, probe: 'report MR open · hand-back issue open',
    cmd: ['npx belay doctor --json > doctor.json', 'glab issue create --title "Belay: what only you can do" --description-file handback.md'],
  },
};
