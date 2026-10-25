// What the checkout scan scores from. Every fact is read or unreadable, never guessed: an unreadable fact keeps a stage
// unknown (null), it never makes it absent. A checkout holds files only: pipelines, protections and approvals live in
// GitLab, and the facts collect-facts.mjs gathers there are scored by `scan --facts` (commands/facts.ts).

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
  /** Azure Pipelines and GitHub Actions only (a GitLab job leaves these out): the file it is defined in, for evidence. */
  file?: string;
  /** Other names the job goes by: its display name, and a CamelCase id as words ("BackendTests" -> "Backend Tests"). */
  aliases?: string[];
  /** Tasks and actions its steps call (`AzureWebApp@1`, `github/codeql-action/analyze@v3`); a task's `Action` input
   * follows its name in brackets (`AzureAppServiceManage@0 (Swap Slots)`). */
  tasks?: string[];
}

export interface CiConfig {
  /** Where the GitLab config came from, for evidence: ".gitlab-ci.yml" or "CI lint (merged)". Azure Pipelines and GitHub
   * Actions jobs are merged in, each naming its own `file`. */
  origin: string;
  jobs: CiJob[];
  /** Template and component includes by name ("Jobs/SAST.gitlab-ci.yml", "acme/belay-pack/tier-gate@1.0.0"). */
  includes: string[];
  /** Includes this scan could not open (project, remote, an Azure template in another repository, a pipeline file that
   * is not valid YAML): a job may come from them. */
  unresolved: string[];
}

export interface ScanFacts {
  source: 'checkout';
  project: string | null;
  /** Repository files the rules look at, by path; content only for the alerting files (else null). */
  files: Fact<Record<string, string | null>>;
  /** Why some of the files were not seen (a walk cut off, a folder that could not be read); null: every file was. A stage
   * that finds none of its files is then unknown, not absent: the file may be in the part not read. */
  filesGap: string | null;
  ci: Fact<CiConfig>;
}
