// linked-evidence (CRA). Every statement links to a GitLab object that resolves. The engine never fetches:
// a separate step resolves each link by API and the input carries the results. Clock arithmetic is
// recomputed from schemas/cra.ts. Legal wording is a struck term: a person decides it, never the engine.
import type { Check } from '../../src/schemas/proof';
import { due } from '../../src/schemas/cra';
import { EngineError, isRecord, rec, str, strList } from '../core/types';
import { type Draft } from './common';

type Status = 'resolved' | 'not_found' | 'forbidden' | 'error';

function statusOf(raw: unknown): Status | undefined {
  const s = isRecord(raw) ? raw.status : undefined;
  return s === 'resolved' || s === 'not_found' || s === 'forbidden' || s === 'error' ? s : undefined;
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.host : null;
  } catch {
    return null;
  }
}

function linkCheck(id: string, links: string[], resolutions: Record<string, unknown>, hosts: string[] | undefined): Check {
  const base = { claim_id: id, name: 'links-resolve' };
  if (links.length === 0) return { ...base, ok: false, detail: 'the statement links to nothing' };
  const bad: string[] = [];
  const unknown: string[] = [];
  for (const url of links) {
    const host = hostOf(url);
    const status = statusOf(resolutions[url]);
    if (!host) bad.push(`${url} is not an http(s) URL`);
    else if (hosts && !hosts.includes(host)) bad.push(`${url} is not on an allowed host (${hosts.join(', ')})`);
    else if (status === 'not_found' || status === 'forbidden') bad.push(`${url} ${status === 'not_found' ? 'does not exist' : 'is not readable'}`);
    else if (status !== 'resolved') unknown.push(url);
  }
  const ref = links.join(' ');
  if (bad.length) return { ...base, ok: false, detail: bad.join('; '), ref };
  if (unknown.length) return { ...base, ok: null, detail: `not resolved yet: ${unknown.join(', ')}`, ref };
  return { ...base, ok: true, detail: `${links.length} link(s) resolve`, ref };
}

function clockCheck(raw: unknown): Check {
  const name = 'clock-arithmetic';
  const c = rec(raw, 'clock');
  const kind = c.kind === 'incident' ? 'incident' : c.kind === 'vulnerability' ? 'vulnerability' : null;
  if (!kind) throw new EngineError('clock.kind must be vulnerability or incident');
  const when = (v: unknown): Date | undefined => (typeof v === 'string' ? new Date(v) : undefined);
  const aware = when(c.aware_at);
  if (!aware || Number.isNaN(+aware)) throw new EngineError('clock.aware_at must be an ISO time');
  const expected = due(kind, aware, when(c.fix_available_at), when(c.notified_at));
  const given = rec(c.due, 'clock.due');
  const same = (a: unknown, b: Date | null): boolean => (b === null ? a === null || a === undefined : typeof a === 'string' && +new Date(a) === +b);
  const wrong = (['early_warning', 'notification', 'final'] as const).filter((k) => !same(given[k], expected[k]));
  return wrong.length === 0
    ? { claim_id: null, name, ok: true, detail: 'early warning (24 h), notification (72 h) and final report recomputed and equal' }
    : { claim_id: null, name, ok: false, detail: `recomputed ${wrong.map((k) => `${k} ${expected[k]?.toISOString() ?? 'none'}`).join(', ')}, the input says otherwise` };
}

export function linkedEvidence(input: Record<string, unknown>): Draft {
  const resolutions = isRecord(input.resolutions) ? input.resolutions : {};
  const hosts = input.allowed_hosts === undefined ? undefined : strList(input.allowed_hosts, 'allowed_hosts');
  const statements = Array.isArray(input.claims) ? input.claims : [];
  const checks: Check[] = [];
  const evidence: Draft['evidence'] = [];
  statements.forEach((raw, i) => {
    const s = rec(raw, `claims[${i}]`);
    const id = str(s.id, `claims[${i}].id`);
    const links = s.links === undefined ? [] : strList(s.links, `claims[${i}].links`);
    checks.push(linkCheck(id, links, resolutions, hosts));
    if (s.human_review === true) {
      checks.push({ claim_id: id, name: 'wording', ok: null, decidedBy: 'human', detail: 'legal wording: a person signs this off; the engine does not judge it' });
    }
    for (const url of links) evidence.push({ kind: 'note', ref: url });
  });
  if (input.clock !== undefined) checks.push(clockCheck(input.clock));
  return { checks, evidence };
}
