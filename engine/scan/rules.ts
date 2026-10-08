// The nine stage rules: the highest rung each stage proves from the facts, with the evidence and the reason. Presence
// is not behaviour: a config file is "configured" (R1); a job that succeeded on the default branch is "running" (R2);
// a merge-blocking setting is "enforced" (R3). Self-proving (R4) is never scored here. A stage that proves nothing while
// a fact that could lift it was unreadable is unknown (null), never absent.
import type { Stage } from '@/schemas/stages';
import type { CiConfig, CiJob, Fact, ScanFacts } from './facts';

export interface ScanCell {
  stage: Stage;
  rung: number | null;
  evidence: string[];
  why: string;
}

interface Proof {
  rung: number;
  evidence: string[];
  /** Facts that could have lifted the stage but were not read. */
  unread: string[];
  why: string;
}

const val = <T>(f: Fact<T>): T | null => (f.ok ? f.value : null);
const fileHits = (facts: ScanFacts, test: (path: string, content: string | null) => boolean): string[] =>
  Object.entries(val(facts.files) ?? {}).filter(([p, c]) => test(p, c)).map(([p]) => p);

/** The CI-backed rungs: configured if a job or include matches; running if such a job succeeded on the default branch. */
function ciStage(facts: ScanFacts, what: string, isJob: (j: CiJob) => boolean, isInclude: RegExp, ranName: RegExp, extra: string[] = []): Proof {
  const p: Proof = { rung: 0, evidence: [...extra], unread: [], why: '' };
  const ci: CiConfig | null = val(facts.ci);
  if (!ci) p.unread.push(facts.ci.ok ? '' : facts.ci.why);
  else {
    p.evidence.push(...ci.jobs.filter(isJob).map((j) => `${ci.origin}: job ${j.name}`));
    p.evidence.push(...ci.includes.filter((i) => isInclude.test(i)).map((i) => `${ci.origin}: include ${i}`));
    if (ci.unresolved.length && p.evidence.length === 0) p.unread.push(`${ci.unresolved.length} include(s) not opened (${ci.unresolved.join(', ')})`);
  }
  if (p.evidence.length === 0) {
    p.why = `no ${what} configured`;
    return p;
  }
  p.rung = 1;
  p.why = `${what} configured`;
  if (!facts.pipeline.ok) {
    p.why += `; whether it runs needs the default branch's last pipeline (${facts.pipeline.why})`;
    return p;
  }
  const ran = facts.pipeline.value.jobs.filter((j) => j.status === 'success' && ranName.test(j.name));
  if (ran.length) {
    p.rung = 2;
    p.evidence.push(...ran.map((j) => `pipeline #${facts.pipeline.ok ? facts.pipeline.value.id : '?'}: ${j.name} succeeded`));
    p.why = `${what} ran on the default branch`;
  } else p.why += ', but it did not succeed in the last default-branch pipeline';
  return p;
}

const RULES: Record<Stage, (f: ScanFacts) => Proof> = {
  plan: (f) => {
    const t = fileHits(f, (p) => /^\.gitlab\/(issue|merge_request)_templates\/./.test(p));
    return t.length
      ? { rung: 1, evidence: t, unread: [], why: 'issue or MR templates configured' }
      : { rung: 0, evidence: [], unread: ['planning lives in GitLab issues and boards, which this scan does not read'], why: 'no templates' };
  },
  create: (f) => {
    const owners = fileHits(f, (p) => /^(\.gitlab\/|docs\/)?CODEOWNERS$/.test(p));
    const p: Proof = { rung: owners.length ? 1 : 0, evidence: owners, unread: [], why: owners.length ? 'CODEOWNERS configured' : 'no CODEOWNERS' };
    if (!f.protection.ok) p.unread.push(f.protection.why);
    else if (f.protection.value.defaultProtected) {
      p.rung = 2;
      p.evidence.push('default branch protected');
      p.why = 'the default branch is protected';
      if (f.approvals.ok && f.approvals.value > 0) {
        p.rung = 3;
        p.evidence.push(`${f.approvals.value} approval rule(s) require an approval`);
        p.why = 'protected, and merges need an approval';
      } else if (!f.approvals.ok) p.unread.push(f.approvals.why);
    }
    return p;
  },
  verify: (f) => ciStage(f, 'test job', (j) => j.junit || j.stage === 'test' || /(^|[-_:\s])(tests?|unit|spec)([-_:\s]|$)/i.test(j.name), /Test|Code-Quality/, /(^|[-_:\s])(tests?|unit|spec)([-_:\s]|$)/i),
  package: (f) => ciStage(f, 'image or package build', (j) => j.sbom || /(docker|podman|buildah)\s+(build|push)|kaniko|jib|npm publish|mvn deploy/.test(j.script), /Jobs\/Build|Docker/, /build|image|package|publish/i),
  secure: (f) => ciStage(f, 'security scanner', (j) => /sast|secret[-_]detection|dependency[-_]scanning|container[-_]scanning/i.test(j.name), /SAST|Secret-Detection|Dependency-Scanning|Container-Scanning|DAST/, /sast|secret[-_]detection|dependency[-_]scanning|container[-_]scanning/i),
  release: (f) => ciStage(f, 'release job', (j) => j.release || /release-cli|glab release create/.test(j.script), /Release/, /release/i),
  configure: (f) => ciStage(f, 'infrastructure as code', (j) => /terraform|tofu|pulumi|helm (upgrade|install)|kubectl apply/.test(j.script), /Terraform|OpenTofu/, /terraform|tofu|deploy|apply/i, fileHits(f, (p) => /\.tf$/.test(p)).slice(0, 3)),
  monitor: (f) => {
    const all = fileHits(f, (p) => /^\.gitlab\/alerting\.ya?ml$|(^|\/)prometheus[^/]*\.ya?ml$|^alerts?\/.+\.ya?ml$/.test(p));
    const real = all.filter((p) => { const c = val(f.files)?.[p]; return c === null || (c ?? '').replace(/#.*$/gm, '').trim() !== ''; });
    if (real.length) return { rung: 1, evidence: real, unread: [], why: 'alerting configured' };
    const empty = all.length ? `${all.join(', ')} is empty: a detector surface, not monitoring; ` : '';
    return { rung: 0, evidence: [], unread: ['alert integrations live in GitLab, which this scan does not read'], why: `${empty}no alerting configured` };
  },
  govern: (f) => ciStage(f, 'Belay proof job or tier gate', (j) => /^belay-(tier-gate|proof)/.test(j.name), /belay-pack\/(tier-gate|proof-engine)/, /^belay-(tier-gate|proof)/, fileHits(f, (p) => p === '.gitlab/duo/agent-config.yml')),
};

export function scoreStage(stage: Stage, facts: ScanFacts): ScanCell {
  const p = RULES[stage](facts);
  const unread = p.unread.filter(Boolean);
  if (p.rung === 0 && unread.length) return { stage, rung: null, evidence: [], why: `unknown: ${p.why}; ${unread.join('; ')}` };
  return { stage, rung: p.rung, evidence: p.evidence, why: p.why };
}
