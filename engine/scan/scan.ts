// Scores the nine stages from facts. Model-free: rules over files, CI config and GitLab settings, no network here.
import { RUNGS, STAGES, type Stage } from '@/schemas/stages';
import type { ScanFacts } from './facts';
import { scoreStage, type ScanCell } from './rules';

export interface MaturityScan {
  schema: 'belay.maturity/0';
  source: ScanFacts['source'];
  project: string | null;
  scanned_at: string;
  cells: (ScanCell & { rung_name: string | null })[];
  /** deep: R3 and above; touched: R1-R2; unknown never counts as absent. */
  counts: { deep: number; touched: number; absent: number; unknown: number };
}

export function scan(facts: ScanFacts, at: Date): MaturityScan {
  const cells = STAGES.map((s) => {
    const c = scoreStage(s, facts);
    return { ...c, rung_name: c.rung === null ? null : (RUNGS[c.rung] ?? null) };
  });
  const n = (test: (r: number | null) => boolean): number => cells.filter((c) => test(c.rung)).length;
  return {
    schema: 'belay.maturity/0', source: facts.source, project: facts.project, scanned_at: at.toISOString(), cells,
    counts: { deep: n((r) => r !== null && r >= 3), touched: n((r) => r === 1 || r === 2), absent: n((r) => r === 0), unknown: n((r) => r === null) },
  };
}

/** The smallest change that would earn each stage its next rung. Read-only: a proposal is text, never a write. */
const NEXT: Record<Stage, [string, string]> = {
  plan: ['configured', 'add .gitlab/issue_templates/ and open a work item per maturity gap'],
  create: ['configured', 'add CODEOWNERS on the CI and policy paths, then protect the default branch'],
  verify: ['configured', 'add a test job with artifacts:reports:junit'],
  package: ['configured', 'build an image per release (include Jobs/Build.gitlab-ci.yml, or a kaniko job)'],
  secure: ['configured', 'include Jobs/SAST.gitlab-ci.yml, Jobs/Secret-Detection.gitlab-ci.yml and Jobs/Dependency-Scanning.gitlab-ci.yml'],
  release: ['configured', 'release from a protected tag with a release: job'],
  configure: ['configured', 'describe the deployment as Terraform or OpenTofu, run by a pipeline'],
  monitor: ['configured', 'connect an alert integration and keep a non-empty .gitlab/alerting.yml'],
  govern: ['configured', 'run `npx belay pair <checkout>` to add the Belay proof jobs and tier gate'],
};

export interface Proposal {
  stage: Stage;
  from: number | null;
  to: number;
  change: string;
}

export function propose(s: MaturityScan): Proposal[] {
  return s.cells.flatMap((c): Proposal[] => {
    if (c.rung === null || c.rung === 0) return [{ stage: c.stage, from: c.rung, to: 1, change: NEXT[c.stage][1] }];
    if (c.rung < 3 && s.source === 'checkout') {
      return [{ stage: c.stage, from: c.rung, to: c.rung + 1, change: 'configured here; the next rung is read from GitLab (run the maturity-scan job, or doctor first)' }];
    }
    return [];
  });
}

export function summary(s: MaturityScan): string {
  const w = Math.max(...s.cells.map((c) => c.stage.length));
  const rows = s.cells.map((c) => `  ${c.stage.padEnd(w)}  ${c.rung === null ? 'R?' : `R${c.rung}`}  ${(c.rung_name ?? 'unknown').padEnd(12)} ${c.why}`);
  const k = s.counts;
  return [`scan ${s.project ?? ''} (${s.source}): ${k.deep} deep, ${k.touched} touched, ${k.absent} absent, ${k.unknown} unknown`, ...rows].join('\n');
}
