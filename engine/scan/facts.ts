// What the maturity scan scores from. Every fact is read or unreadable, never guessed: an unreadable fact keeps a stage
// unknown (null), it never makes it absent. A checkout scan reads files only; a GitLab scan (collect-facts.mjs in the
// maturity-scan component) adds the pipeline, protections and approval rules.

export type Fact<T> = { ok: true; value: T } | { ok: false; why: string };

export const known = <T>(value: T): Fact<T> => ({ ok: true, value });
export const unread = <T>(why: string): Fact<T> => ({ ok: false, why });

export interface CiJob {
  name: string;
  stage: string | null;
  /** script, before_script and after_script lines, joined. */
  script: string;
  junit: boolean;
  release: boolean;
  /** An SBOM report (artifacts:reports:cyclonedx). */
  sbom: boolean;
}

export interface CiConfig {
  /** Where the config came from, for evidence: ".gitlab-ci.yml" or "CI lint (merged)". */
  origin: string;
  jobs: CiJob[];
  /** Template and component includes by name ("Jobs/SAST.gitlab-ci.yml", "acme/belay-pack/tier-gate@1.0.0"). */
  includes: string[];
  /** Includes this scan could not open (project, remote): a job may come from them. */
  unresolved: string[];
}

export interface ScanFacts {
  source: 'checkout' | 'gitlab';
  project: string | null;
  /** Repository files the rules look at, by path. A GitLab scan knows that a file exists, not always its content (null). */
  files: Fact<Record<string, string | null>>;
  ci: Fact<CiConfig>;
  /** The latest successful default-branch pipeline. */
  pipeline: Fact<{ id: number | null; jobs: { name: string; status: string }[] }>;
  /** Protected branch names; and whether the default branch is one of them. */
  protection: Fact<{ defaultProtected: boolean }>;
  /** Approval rules that require at least one approval. */
  approvals: Fact<number>;
}
