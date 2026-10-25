// The nine stages read from a checkout, by the one maturity rubric (commands/rubric.ts): a stage is configured (R1) when
// its R1 presence is in the files or the CI config. A checkout holds no run, protection or approval, so it never credits
// above R1 (presence is not behaviour); `scan --facts` reads the rungs above from GitLab. A stage that shows nothing while
// something that could lift it was not read is unknown (null), never absent.
import type { Stage } from '../../src/schemas/stages';
import { RUBRIC } from '../commands/rubric';
import type { CiJob, Fact, ScanFacts } from './facts';
import { appliesIac, deploys, namesOf, packages, runsScanner } from './pipelines/signals';

export interface ScanCell {
  stage: Stage;
  rung: number | null;
  evidence: string[];
  why: string;
}

const val = <T>(f: Fact<T>): T | null => (f.ok ? f.value : null);
const fileHits = (facts: ScanFacts, test: (path: string, content: string | null) => boolean): string[] =>
  Object.entries(val(facts.files) ?? {}).filter(([p, c]) => test(p, c)).map(([p]) => p);
/** Why a file a stage looks for may exist unseen: a stage that found none is then unknown, not absent. */
const filesGap = (facts: ScanFacts): string[] => (facts.filesGap ? [facts.filesGap] : []);

const ALERTING = /^\.gitlab\/alerting\.ya?ml$|(^|\/)prometheus[^/]*\.ya?ml$|^alerts?\/.+\.ya?ml$/;
const alerting = (f: ScanFacts): string[] => fileHits(f, (p) => ALERTING.test(p));
/** Read and holding nothing but comments. A file whose content is not known (null) is not blank. */
const blank = (f: ScanFacts, p: string): boolean => {
  const c = val(f.files)?.[p];
  return c !== null && (c ?? '').replace(/#.*$/gm, '').trim() === '';
};
const NOT_HERE = 'which a checkout scan does not read';

/** What a checkout sees beyond the rubric's job names, each only more R1 evidence for its stage: a job's reports and
 * script (the GitLab facts hold a job's name only), template and component includes by name (GitLab merges them into
 * jobs the rubric names), and files. `elsewhere`: what could lift the stage that lives in GitLab, so absence is unknown. */
interface Seen {
  what: string;
  job?: (j: CiJob) => boolean;
  include?: RegExp;
  files?: (f: ScanFacts) => string[];
  elsewhere?: string;
  /** A note on what was found and is no evidence. */
  aside?: (f: ScanFacts) => string;
}

const SEEN: Record<Stage, Seen> = {
  plan: { what: 'issue templates', files: (f) => fileHits(f, (p) => /^\.gitlab\/issue_templates\/./.test(p)), elsewhere: `planning lives in GitLab issues and boards, ${NOT_HERE}` },
  create: { what: 'CODEOWNERS', files: (f) => fileHits(f, (p) => /^(\.gitlab\/|docs\/)?CODEOWNERS$/.test(p)), elsewhere: `whether the default branch is protected is a GitLab setting, ${NOT_HERE}` },
  verify: { what: 'test job', job: (j) => j.junit, include: /Jobs\/Test/ },
  package: { what: 'image or package build', job: (j) => j.sbom || packages(j) || /(docker|podman|buildah)\s+(build|push)|kaniko|jib|npm publish|mvn deploy/.test(j.script), include: /Jobs\/Build|Docker/ },
  secure: { what: 'security scanner', job: runsScanner, include: /SAST|Secret-Detection|Dependency-Scanning|Container-Scanning|DAST/ },
  release: { what: 'release job', job: (j) => j.release || deploys(j) || /release-cli|glab release create|gh release create/.test(j.script), include: /Release/ },
  configure: {
    what: 'infrastructure as code',
    job: (j) => appliesIac(j) || /terraform|tofu|pulumi|helm (upgrade|install)|kubectl apply/.test(j.script),
    include: /Terraform|OpenTofu/,
    files: (f) => fileHits(f, (p) => /\.(tf|bicep)$|(^|\/)azuredeploy[^/]*\.json$/.test(p)).slice(0, 3),
  },
  monitor: {
    what: 'alerting or monitor job',
    files: (f) => alerting(f).filter((p) => !blank(f, p)),
    elsewhere: `alert integrations live in GitLab, ${NOT_HERE}`,
    aside: (f) => { const empty = alerting(f).filter((p) => blank(f, p)); return empty.length ? `${empty.join(', ')} is empty: a detector surface, not monitoring; ` : ''; },
  },
  govern: { what: 'Belay tier gate', include: /belay-pack\/tier-gate@/ },
};

export function scoreStage(stage: Stage, facts: ScanFacts): ScanCell {
  const seen = SEEN[stage];
  const r1 = RUBRIC.find((r) => r.stage === stage)?.r1;
  const evidence = seen.files?.(facts) ?? [];
  const unread: string[] = [];
  if (r1?.kind === 'jobs') {
    const ci = val(facts.ci);
    if (!ci) unread.push(facts.ci.ok ? '' : facts.ci.why);
    else {
      evidence.push(...ci.jobs.filter((j) => namesOf(j).some((n) => r1.names.test(n)) || seen.job?.(j)).map((j) => `${j.file ?? ci.origin}: job ${j.name}`));
      evidence.push(...ci.includes.filter((i) => seen.include?.test(i)).map((i) => `${ci.origin}: include ${i}`));
      if (ci.unresolved.length && evidence.length === 0) unread.push(`${ci.unresolved.length} include(s) not opened (${ci.unresolved.join(', ')})`);
    }
  }
  if (evidence.length) {
    const next = r1?.kind === 'jobs' ? `whether it runs needs the default branch's last pipeline, ${NOT_HERE}` : (seen.elsewhere ?? '');
    return { stage, rung: 1, evidence, why: `${seen.what} configured; ${next}` };
  }
  if (seen.files) unread.push(...filesGap(facts));
  if (seen.elsewhere) unread.push(seen.elsewhere);
  const why = `${seen.aside?.(facts) ?? ''}no ${seen.what} configured`;
  const missing = unread.filter(Boolean);
  return missing.length ? { stage, rung: null, evidence: [], why: `unknown: ${why}; ${missing.join('; ')}` } : { stage, rung: 0, evidence: [], why };
}
