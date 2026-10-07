// The envelope: how far one change may reach. Size and environments come from envelope.hands_off in
// trust-policy.yml, forbidden paths from the action class. Production is reachable only for classes whose
// proof is mechanical (envelope.production_requires_proof). Pure: diff text and policy in, verdict out.
import { parseDiff, type DiffFile } from '../parse/diff';
import { matchesEnvironment, matchesPath } from './glob';
import type { EnginePolicy } from './load';

export interface EnvelopeResult {
  class: string;
  within: boolean;
  files: number;
  lines: number; // added plus removed
  paths_touched: string[];
  environments: string[];
  violations: string[];
}

export function measure(files: readonly DiffFile[]): { files: number; lines: number; paths: string[] } {
  const paths = [...new Set(files.flatMap((f) => [f.path, ...(f.oldPath && f.oldPath !== f.path ? [f.oldPath] : [])]))];
  return { files: files.length, lines: files.reduce((n, f) => n + f.added + f.removed, 0), paths };
}

export function checkEnvelope(
  policy: EnginePolicy,
  classId: string,
  diffText: string,
  environments: readonly string[] = [],
): EnvelopeResult {
  const cls = Object.hasOwn(policy.classes, classId) ? policy.classes[classId] : undefined; // never Object.prototype's `constructor`
  const parsed = parseDiff(diffText);
  const m = measure(parsed);
  const limits = policy.envelope.hands_off;
  const violations: string[] = [];

  if (!cls) violations.push(`unknown action class "${classId}"`);
  if (cls?.ceiling === 'human_only') violations.push(`class ${classId} is human_only: no machine action is inside any envelope`);
  if (m.files > limits.max_files) violations.push(`${m.files} files changed, envelope allows ${limits.max_files}`);
  if (m.lines > limits.max_lines) violations.push(`${m.lines} lines changed, envelope allows ${limits.max_lines}`);
  for (const pattern of cls?.deny_paths ?? []) {
    const hit = m.paths.filter((p) => matchesPath(pattern, p));
    if (hit.length) violations.push(`touches denied path ${pattern}: ${hit.join(', ')}`);
  }
  const allow = cls?.allow_paths;
  if (allow) {
    const stray = m.paths.filter((p) => !allow.some((pattern) => matchesPath(pattern, p)));
    if (stray.length) violations.push(`touches paths outside allow_paths of ${classId}: ${stray.join(", ")}`);
  }
  for (const env of environments) {
    if (!limits.environments.some((pat) => matchesEnvironment(pat, env))) {
      violations.push(`environment "${env}" is outside the envelope (${limits.environments.join(', ')})`);
    } else if (env === 'production') {
      const proofs = policy.envelope.production_requires_proof ?? [];
      if (!cls?.proof || !proofs.includes(cls.proof)) {
        violations.push(`production needs a mechanical proof (${proofs.join(', ') || 'none allowed'}); ${classId} has ${cls?.proof ?? 'none'}`);
      }
    }
  }
  return {
    class: classId,
    within: violations.length === 0,
    files: m.files,
    lines: m.lines,
    paths_touched: m.paths,
    environments: [...environments],
    violations,
  };
}
