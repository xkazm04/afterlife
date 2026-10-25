// One read-only `az monitor log-analytics query` call: App Insights' runAz plus the two failures only this verb has
// (the preview extension is not installed; the workspace has no AppServiceHTTPLogs), and its output reshaped into the
// `tables` form the App Insights parsers read. Never throws.
import type { Exec } from '../../types';
import { failSummary, type AzOutcome } from '../insights/az';

export const NO_TABLE = 'no AppServiceHTTPLogs in this workspace - the App Service diagnostic setting is off';
export const NO_EXTENSION = 'the az log-analytics extension is not installed - run `az extension add -n log-analytics`';

export type LogsOutcome = AzOutcome | { ok: false; summary: string; ms: number; noTable: true };

/** `az monitor log-analytics query` over `timespan`: an ISO duration (`P1D`) or an ISO interval (`<from>/<to>`). */
export function queryArgs(workspaceId: string, q: string, timespan: string, subscription?: string): string[] {
  return ['monitor', 'log-analytics', 'query', '-w', workspaceId, '--analytics-query', q, '--timespan', timespan, ...(subscription ? ['--subscription', subscription] : []), '-o', 'json'];
}

export async function runLogsQuery(exec: Exec, args: readonly string[], timeoutMs?: number): Promise<LogsOutcome> {
  const r = await exec('az', args, { timeoutMs });
  if (r.code !== 0) {
    // The semantic error's first line is only "(BadArgumentError) The request had some invalid properties".
    if (/Failed to resolve table[^\n]*AppServiceHTTPLogs/i.test(r.stderr)) return { ok: false, summary: NO_TABLE, ms: r.ms, noTable: true };
    if (/requires the extension log-analytics/i.test(r.stderr)) return { ok: false, summary: NO_EXTENSION, ms: r.ms };
    return { ok: false, summary: failSummary(r.stderr, r.code), ms: r.ms };
  }
  try {
    return { ok: true, json: r.stdout.trim() === '' ? null : JSON.parse(r.stdout), ms: r.ms };
  } catch {
    return { ok: false, summary: 'az returned output that is not JSON', ms: r.ms };
  }
}

/**
 * This verb prints a list of row objects whose every value is a string (`[{TableName, n: "15", v: "0", ...}]`), not
 * App Insights' `{tables}`; this turns it into that shape over `columns`, numbers parsed, so toPoints reads either.
 * A value that is empty or not a finite number becomes null (dropped by toPoints, never read as 0).
 */
/** `text` columns stay strings (a timestamp, a site name); every other column is a number. */
export function asTable(json: unknown, columns: readonly string[], text: readonly string[] = ['timestamp']): { tables: { columns: { name: string }[]; rows: unknown[][] }[] } {
  const list = Array.isArray(json) ? json : [];
  const rows = list.map((o) => columns.map((c) => cell((o ?? {}) as Record<string, unknown>, c, text.includes(c))));
  return { tables: [{ columns: columns.map((name) => ({ name })), rows }] };
}

function cell(o: Record<string, unknown>, c: string, text: boolean): unknown {
  const v = o[c];
  if (text) return typeof v === 'string' && v ? v : null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
