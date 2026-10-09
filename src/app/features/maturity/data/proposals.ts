import { LEDGERLINE_REPO, PROPOSAL_G1 } from './proposalG1';
import { PROPOSAL_G3 } from './proposalG3';
import type { ProposalExtra } from './types';

// Per proposal: the invitational line, the work item, what the MR writes. Keyed by the shared dataset's gap id.
// Gaps are invitations ("worth exploring"), never directives.
// g2 is a new file, so it previews against any project that has none: GitLab reads an approval policy from
// .gitlab/security-policies/policy.yml of the project linked as the security policy project, here the project itself [R?].
const PROPOSAL_G2: ProposalExtra = {
  invite: 'Worth exploring: agent-authored MRs could wait for the guardrail’s approval before they merge, so a quoted objection becomes a block, not a comment.',
  workItem: '#132',
  branch: 'belay/gap-g2-guardrail-required',
  repo: LEDGERLINE_REPO,
  mrId: '!47',
  kind: 'mr',
  cls: 'ci-config.change',
  tier: 'assisted',
  earns: 'R3 on the rescan after you merge, once this project is its own security policy project: the approval policy is a GitLab object that blocks a merge.',
  needsRun: false,
  runsOn: 'main',
  files: [
    {
      path: '.gitlab/security-policies/policy.yml',
      isNew: true,
      lines: [
        '+approval_policy:',
        '+  - name: guardrail-on-agent-mrs',
        '+    description: Agent-authored MRs need the guardrail’s approval',
        '+    enabled: true',
        '+    rules:',
        '+      - type: any_merge_request',
        '+        branch_type: protected',
        '+        commits: any',
        '+    actions:',
        '+      - type: require_approval',
        '+        approvals_required: 1',
        '+        user_approvers: [belay-guardrail-bot]',
      ],
    },
  ],
};

const PROPOSAL_G4: ProposalExtra = {
  invite: 'Worth exploring first: Belay could probe the alert integration before proposing anything, because nothing here can tell a quiet service from a broken pipe.',
  workItem: '#134',
  branch: null,
  repo: LEDGERLINE_REPO,
  mrId: null,
  kind: 'probe',
  cls: 'read only',
  tier: null,
  earns: 'Nothing by itself. The probe reads; it decides whether an MR is worth proposing at all.',
  needsRun: false,
  runsOn: 'main',
  probeResult: 'integration active · 0 alerts in 30 days · last test payload: never. Still R1. Next step is a person sending a test alert, not an MR.',
  files: [],
};

export const PROPOSAL_EXTRAS: Readonly<Record<string, ProposalExtra>> = {
  g1: PROPOSAL_G1,
  g2: PROPOSAL_G2,
  g3: PROPOSAL_G3,
  g4: PROPOSAL_G4,
};
