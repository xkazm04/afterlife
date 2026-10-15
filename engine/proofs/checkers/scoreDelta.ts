// score-delta (maturity, ci-config.change: "a CI change does not lower maturity"). Reads two belay.maturity/0 scans that
// `engine/cli.ts scan` wrote, one for the base and one for the head of the change, parses each with the server's own
// parser (src/schemas/maturity.ts), and compares the nine stages cell by cell. It passes only when both scans are of
// the task's project by the same engine version and no stage's rung is lower at head than at base.
//
// A stage unknown at both ends (rung null) is unchanged and does not block. A stage known at one end only cannot be
// compared: unknown is never absent, so that is an ok:null check, not a pass. Two scans from different engine versions
// (or projects) prove nothing either way. Input: `base` and `head`, each `{scan, job_ref?}`, `scan` inline or `$file`.
import type { Check } from '../../../src/schemas/proof';
import { parseMaturityScan, type MaturityScan } from '../../../src/schemas/maturity';
import { RUNGS } from '../../../src/schemas/stages';
import { optStr, rec } from '../../core/types';
import type { Draft } from '../common';
import { checksFor, jobEvidence, jsonEvidence, type At, type Read } from './evidence';

function readScan(raw: unknown, what: string): Read<MaturityScan> {
  const r = jsonEvidence(raw, what);
  if (!r.ok) return r;
  const p = parseMaturityScan(r.value);
  return p.ok ? { ok: true, value: p.scan } : { ok: false, reason: `${what}: ${p.reason}` };
}

const rungName = (r: number | null): string => (r === null ? 'unknown' : (RUNGS[r] ?? String(r)));

function stageCheck(at: At, base: MaturityScan, head: MaturityScan): Check {
  const lower: string[] = [];
  const unknown: string[] = [];
  let lifted = 0;
  let dark = 0;
  base.cells.forEach((b, i) => {
    const h = head.cells[i];
    if (!h) return;
    if (b.rung === null && h.rung === null) dark += 1;
    else if (b.rung === null || h.rung === null) unknown.push(`${b.stage} ${rungName(b.rung)} then ${rungName(h.rung)}`);
    else if (h.rung < b.rung) lower.push(`${b.stage} ${rungName(b.rung)} to ${rungName(h.rung)}`);
    else if (h.rung > b.rung) lifted += 1;
  });
  if (lower.length) return at('no-stage-regressed', false, `lower at head: ${lower.join(', ')}`);
  if (unknown.length) return at('no-stage-regressed', null, `known at one end only, cannot compare: ${unknown.join(', ')}`);
  const notes = [lifted ? `${lifted} lifted` : '', dark ? `${dark} unknown at both ends` : ''].filter(Boolean).join(', ');
  return at('no-stage-regressed', true, `${base.cells.length} stage(s), none lower at head${notes ? ` (${notes})` : ''}`);
}

export function scoreDelta(input: Record<string, unknown>, projectId: number): Draft {
  const at = checksFor(input);
  const b = rec(input.base, 'base');
  const h = rec(input.head, 'head');
  const refs = [optStr(b.job_ref, 'base.job_ref'), optStr(h.job_ref, 'head.job_ref')] as const;
  const base = readScan(b.scan, 'base.scan');
  const head = readScan(h.scan, 'head.scan');
  const evidence = jobEvidence(...refs);
  if (!base.ok || !head.ok) {
    const why = [base, head].flatMap((r) => (r.ok ? [] : [r.reason])).join('; ');
    return { checks: [at('same-engine', null, why), at('no-stage-regressed', null, why)], evidence };
  }
  const s = { base: base.value, head: head.value };
  const checks: Check[] = [];
  const sameEngine = s.base.engine_version === s.head.engine_version;
  const sameProject = s.base.project_id === s.head.project_id && s.base.project_id === projectId;
  checks.push(
    sameEngine
      ? at('same-engine', true, `both scans by engine ${s.base.engine_version}`, refs[1])
      : at('same-engine', null, `engine versions differ (${s.base.engine_version} then ${s.head.engine_version}): the scans are not comparable`, refs[1]),
  );
  checks.push(at('same-project', sameProject ? true : null, sameProject ? `both scans of project ${projectId}` : `scans of projects ${s.base.project_id} then ${s.head.project_id}, the task is on ${projectId}`));
  checks.push(sameEngine && sameProject ? stageCheck(at, s.base, s.head) : at('no-stage-regressed', null, 'needs two scans of one project by one engine version'));
  return { checks, evidence };
}
