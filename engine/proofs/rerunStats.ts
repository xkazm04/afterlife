// rerun-stats (medic). N reruns of one SHA, read from job records: the counts are recomputed here, never
// taken from the agent, and the flake / real-failure call uses thresholds written down in the policy.
import type { Check } from '../../src/schemas/proof';
import { isRecord, num, optStr, rec, str } from '../core/types';
import type { EnginePolicy, RerunThresholds } from '../policy/load';
import { claimFor, type Draft } from './common';

/** Defaults apply only when trust-policy.yml has no `rerun_stats` block; the check detail says which were used. */
export const DEFAULT_THRESHOLDS: RerunThresholds = { min_runs: 5, real_failure_rate: 0.8 };

/** Failures that say nothing about the code under test: the runner or the platform broke. */
const INFRA = new Set(['runner_system_failure', 'stuck_or_timeout_failure', 'scheduler_failure', 'api_failure', 'runner_unsupported', 'job_execution_timeout']);

export type Classification = 'stable-pass' | 'flake' | 'real-failure';

interface Run {
  job_id: string;
  sha: string;
  status: string;
  failure_reason?: string;
}

function parseRun(raw: unknown, i: number): Run {
  const r = rec(raw, `runs[${i}]`);
  return { job_id: String(r.job_id ?? i), sha: str(r.sha, `runs[${i}].sha`), status: str(r.status, `runs[${i}].status`), failure_reason: optStr(r.failure_reason, `runs[${i}].failure_reason`) };
}

export function thresholdsOf(policy: EnginePolicy): { t: RerunThresholds; source: string } {
  const p = policy.rerun_stats;
  return { t: { ...DEFAULT_THRESHOLDS, ...p }, source: p ? 'trust-policy.yml rerun_stats' : 'engine defaults (no rerun_stats in the policy)' };
}

export function classify(passes: number, fails: number, t: RerunThresholds): Classification {
  if (fails === 0) return 'stable-pass';
  return fails / (passes + fails) >= t.real_failure_rate ? 'real-failure' : 'flake';
}

export function rerunStats(input: Record<string, unknown>, policy: EnginePolicy): Draft {
  const runs = (Array.isArray(input.runs) ? input.runs : []).map(parseRun);
  const { t, source } = thresholdsOf(policy);
  const sha = str(input.sha, 'sha');
  const at = (name: string, ok: boolean | null, detail: string): Check => ({ claim_id: claimFor(input, name), name, ok, detail });
  const checks: Check[] = [];

  const stray = runs.filter((r) => r.sha !== sha);
  checks.push(at('same-sha', runs.length > 0 && stray.length === 0, stray.length ? `${stray.length} run(s) are not on ${sha}: ${stray.map((r) => r.job_id).join(', ')}` : `${runs.length} run(s), all on ${sha}`));

  const counted = runs.filter((r) => r.sha === sha && (r.status === 'success' || (r.status === 'failed' && !INFRA.has(r.failure_reason ?? ''))));
  const passes = counted.filter((r) => r.status === 'success').length;
  const fails = counted.length - passes;
  const ignored = runs.length - counted.length;
  checks.push(at('enough-runs', counted.length >= t.min_runs ? true : null, `${counted.length} usable run(s), policy needs ${t.min_runs}${ignored ? ` (${ignored} cancelled or infrastructure failures left out)` : ''}; thresholds from ${source}`));

  const result = classify(passes, fails, t);
  const rate = counted.length ? fails / counted.length : 0;
  const claim = isRecord(input.claim) ? input.claim : undefined;
  if (claim?.passes !== undefined || claim?.fails !== undefined) {
    const same = num(claim.passes, 'claim.passes') === passes && num(claim.fails, 'claim.fails') === fails;
    checks.push(at('counts-match', same, same ? `recomputed ${passes} pass / ${fails} fail, as claimed` : `claimed ${String(claim.passes)} pass / ${String(claim.fails)} fail, recomputed ${passes} / ${fails}`));
  }
  const claimed = claim ? optStr(claim.classification, 'claim.classification') : undefined;
  const verdictDetail = `${result}: ${fails} failed of ${counted.length} (rate ${rate.toFixed(2)}, real failure at ${t.real_failure_rate})`;
  checks.push(counted.length < t.min_runs ? at('classification', null, `${verdictDetail}, too few runs to call`) : claimed === undefined ? at('classification', null, `${verdictDetail}, nothing claimed`) : at('classification', claimed === result, `${verdictDetail}; the agent claimed ${claimed}`));
  return { checks, evidence: runs.map((r) => ({ kind: 'job' as const, ref: r.job_id })) };
}
