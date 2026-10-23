// The gap template catalogue: the scan's next change for a stage (engine/scan/scan.ts NEXT), where it is mechanical
// enough for Belay to write. Each template names the one stage and rung it earns; a CI template adds GitLab's own
// include lines, a file template adds one new file. Anything not here is a gap a person writes by hand.
import type { Stage } from '@/schemas/stages';
import type { GapTemplateId } from '../types';

interface Common {
  stage: Stage;
  /** The rung the change earns. */
  to: number;
  /** What the MR changes, in words, for its title. */
  title: string;
  /** The scan's next change for the stage, word for word (engine/scan/scan.ts NEXT). */
  change: string;
}

/** CI templates to add to the top-level include: list, as `- template: <path>` lines. */
export interface CiTemplate extends Common { kind: 'ci'; templates: readonly string[] }
/** One new file. Refused when the project already has it. */
export interface FileTemplate extends Common { kind: 'file'; path: string; content: string }
export type GapTemplate = CiTemplate | FileTemplate;

const ISSUE_TEMPLATE = `<!-- A maturity gap: one stage short of its next rung. Belay opened it from the maturity scan. -->
## The gap

Stage, and its rung now and next (for example: secure R0 -> R1).

## Evidence

What the scan read, with links to the GitLab objects (or that it read nothing).

## The change

The smallest change that earns the next rung.

## Done when

The scan reads the next rung from GitLab, with a link to the object that proves it.

/label ~"maturity::gap"
`;

export const TEMPLATES: Record<GapTemplateId, GapTemplate> = {
  'secure-includes': {
    kind: 'ci', stage: 'secure', to: 1, title: 'include SAST, Secret Detection and Dependency Scanning',
    change: 'include Jobs/SAST.gitlab-ci.yml, Jobs/Secret-Detection.gitlab-ci.yml and Jobs/Dependency-Scanning.gitlab-ci.yml',
    templates: ['Jobs/SAST.gitlab-ci.yml', 'Jobs/Secret-Detection.gitlab-ci.yml', 'Jobs/Dependency-Scanning.gitlab-ci.yml'],
  },
  'package-build': {
    kind: 'ci', stage: 'package', to: 1, title: 'build an image per release',
    change: 'build an image per release (include Jobs/Build.gitlab-ci.yml, or a kaniko job)',
    templates: ['Jobs/Build.gitlab-ci.yml'],
  },
  'plan-issue-templates': {
    kind: 'file', stage: 'plan', to: 1, title: 'add a maturity gap issue template',
    change: 'add .gitlab/issue_templates/ and open a work item per maturity gap',
    path: '.gitlab/issue_templates/maturity-gap.md', content: ISSUE_TEMPLATE,
  },
};

/** The template, or why it does not earn this stage this rung. */
export function templateFor(id: GapTemplateId, stage: Stage, to: number): GapTemplate | string {
  const t = TEMPLATES[id];
  if (t.stage !== stage || t.to !== to) return `the ${id} template earns ${t.stage} R${t.to}, not ${stage} R${to}: nothing is planned`;
  return t;
}
