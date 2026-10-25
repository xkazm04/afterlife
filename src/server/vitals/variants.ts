// Which variant a CI run is: master full vs its hotfix lane vs a feature PR vs nightly. The first rule whose every
// given condition holds wins, so a narrower rule (master-hotfix) must come before a wider one (master-full).
import type { CiRun, VariantRule } from '@/schemas/vitals';

const globs = new Map<string, RegExp>();

/** A glob over the short branch name: `*` stays within a segment, `**` crosses them, everything else is literal. */
export function branchGlob(glob: string): RegExp {
  let re = globs.get(glob);
  if (!re) {
    const body = glob
      .split('**')
      .map((part) => part.split('*').map((lit) => lit.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*'))
      .join('.*');
    re = new RegExp(`^${body}$`);
    globs.set(glob, re);
  }
  return re;
}

export function ruleMatches(run: CiRun, rule: VariantRule): boolean {
  const m = rule.match;
  if (rule.pipelineId !== run.pipelineId) return false;
  if (m.branch !== undefined && !branchGlob(m.branch).test(run.branch)) return false;
  if (m.reason !== undefined && !m.reason.includes(run.reason)) return false;
  if (m.parameter !== undefined && run.parameters?.[m.parameter.name] !== m.parameter.value) return false;
  return true;
}

/** The first rule whose pipeline, branch glob, reason and parameter all match; undefined when none does. */
export function classifyVariant(run: CiRun, rules: VariantRule[]): string | undefined {
  return rules.find((r) => ruleMatches(run, r))?.id;
}
