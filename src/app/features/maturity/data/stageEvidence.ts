import type { Stage } from '@/schemas';
import type { StageEvidence } from './types';

// Evidence objects are what each rung's detector read. Day 0 notes are what the first scan found.
export const STAGE_EVIDENCE: Readonly<Record<Stage, StageEvidence>> = {
  plan: {
    objs: {
      1: [
        { kind: 'file', label: '.gitlab/issue_templates/maturity-gap.md', ref: 'main @ 5e1f0a2', path: '/-/blob/main/.gitlab/issue_templates/maturity-gap.md' },
        { kind: 'label', label: 'maturity::gap', ref: 'project label', path: '/-/labels?search=maturity' },
        { kind: 'work item', label: 'gap work items #131 #132 #133 #134', ref: 'opened 14:02 by the autopilot', path: '/-/issues/?label_name[]=maturity::gap' },
      ],
    },
    missing: 'The gap work items exist but none has aged or been worked: no MR on main links one yet.',
    day0: 'No templates, no labels, no work items.',
  },
  create: {
    objs: {
      1: [{ kind: 'file', label: '.gitlab/CODEOWNERS', ref: 'CI paths · trust-policy.yml', path: '/-/blob/main/.gitlab/CODEOWNERS' }],
      2: [
        { kind: 'setting', label: 'protected branch main', ref: 'push: maintainers · merge: developers', path: '/-/settings/repository#js-protected-branches-settings' },
        { kind: 'merge request', label: '!39 · !41 reviewed before merge', ref: 'approval events, last 14 d', path: '/-/merge_requests/41' },
      ],
    },
    missing: 'No approval rule makes a reviewer required on agent-authored MRs. A protected branch alone does not block a merge.',
    day0: 'CODEOWNERS on main, no review events in 14 days.',
  },
  verify: {
    objs: {
      1: [{ kind: 'file', label: '.gitlab-ci.yml · job test', ref: 'artifacts:reports:junit', path: '/-/blob/main/.gitlab-ci.yml' }],
      2: [{ kind: 'pipeline', label: 'pipeline #9850 on main', ref: 'JUnit report attached', path: '/-/pipelines/9850/test_report' }],
      3: [
        { kind: 'setting', label: 'pipelines must succeed', ref: 'merge checks', path: '/-/settings/merge_requests' },
        { kind: 'track', label: 'T5 medic armed by !11', ref: 'pipeline.retry · HANDS-OFF', path: '/-/merge_requests/11' },
      ],
    },
    missing: 'Belay does not yet re-derive the test totals from the job API. Nothing in this batch would earn it.',
    day0: 'Test job on main, no run in 14 days.',
  },
  package: {
    objs: {
      1: [{ kind: 'file', label: '.gitlab-ci.yml · job build-image', ref: 'docker build + push', path: '/-/blob/main/.gitlab-ci.yml' }],
      2: [{ kind: 'registry', label: 'statements-service:v0.4.2', ref: 'container registry · one image per release', path: '/container_registry' }],
    },
    missing: 'Deploys do not check that the image came from this registry. Nothing in this batch would earn it.',
    day0: 'No publish job.',
  },
  secure: {
    objs: {
      1: [{ kind: 'file', label: 'SAST · Secret-Detection · Dependency-Scanning includes', ref: 'added by !17', path: '/-/blob/main/.gitlab-ci.yml' }],
      2: [{ kind: 'pipeline', label: 'pipeline #9850 security reports', ref: 'sast · secret_detection · dependency_scanning', path: '/-/pipelines/9850/security' }],
      3: [{ kind: 'policy', label: 'scan-result policy block-critical', ref: 'acme-lab/ledgerline-policies · seen 14:02', path: '/-/security/policies' }],
    },
    missing: 'Scanner findings are trusted as reported. Nothing re-derives them against the SBOM that actually shipped.',
    day0: 'No scanning include on main.',
  },
  release: {
    objs: {
      1: [{ kind: 'file', label: '.gitlab-ci.yml · job release', ref: 'release: keyword', path: '/-/blob/main/.gitlab-ci.yml' }],
      2: [{ kind: 'release', label: 'release v0.4.2', ref: 'from protected tag · asset sbom.cdx.json', path: '/-/releases/v0.4.2' }],
    },
    missing: 'A release can be cut without a statement on its findings. Nothing fails when one is missing.',
    day0: 'No release job, no releases.',
  },
  configure: {
    objs: {
      1: [{ kind: 'file', label: 'infra/cloudrun.tf · environment: blocks', ref: 'staging · production', path: '/-/blob/main/infra/cloudrun.tf' }],
      2: [
        { kind: 'terraform state', label: 'GitLab-managed state production', ref: 'written 09:51', path: '/-/terraform' },
        { kind: 'deployment', label: 'production · Cloud Run rev 00042', ref: 'deployed 09:51', path: '/-/environments' },
      ],
    },
    missing: 'The Terraform state accepts writes from any branch pipeline. Applies are not tied to the protected environment.',
    day0: 'No IaC, no environments.',
  },
  monitor: {
    objs: {
      1: [{ kind: 'alert integration', label: 'HTTP endpoint cloud-run-alerts', ref: 'active', path: '/-/settings/operations' }],
    },
    missing: 'No alert received in 30 days. A quiet service and a broken integration look the same from here.',
    day0: 'Unknown: the scan token could not read alert integrations.',
  },
  govern: {
    objs: {
      1: [
        { kind: 'compliance framework', label: 'belay-baseline', ref: 'assigned to the project', path: '/-/settings/general' },
        { kind: 'file', label: 'trust-policy.yml', ref: 'tier per action class', path: '/-/blob/main/trust-policy.yml' },
      ],
      2: [{ kind: 'audit event', label: 'tier.demote patch-bump', ref: '14:20 · audit events present', path: '/-/audit_events' }],
      3: [{ kind: 'pipeline', label: 'tier-gate job required on every MR', ref: 'armed by !4 · tier record per class', path: '/-/merge_requests/4' }],
    },
    missing: 'The AI audit event report is unavailable on this instance (setup doctor), so Belay cannot re-derive agent actions from GitLab’s own record yet.',
    day0: 'No framework, no audit retention.',
  },
};
