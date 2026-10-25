// One KQL per signal the App Service HTTP logs can answer, 1-hour bins from `since`, each returning (timestamp, v, n)
// rows like App Insights' kql. The logs hold no exceptions and no availability tests, so those two are never asked:
// an omitted signal is unknown, not 0.
import type { ProdSignal } from '@/schemas/vitals';

type LogsSignal = Extract<ProdSignal, 'requests' | 'failed-rate' | 'p95-ms'>;

/** TimeTaken is milliseconds (an int column; the front end's 230 s timeout shows as ~230000), so p95-ms needs no scale. */
const AGG: Record<LogsSignal, string> = {
  requests: 'count()',
  'failed-rate': 'countif(ScStatus >= 500) * 1.0 / count()',
  'p95-ms': 'percentile(TimeTaken, 95)',
};

export const LOGS_SIGNALS = Object.keys(AGG) as LogsSignal[];

/** The columns every binned query returns, in the order asTable lays them out. */
export const COLUMNS = ['timestamp', 'v', 'n'] as const;

/** Only the site's own logs: a deployment slot's `_ResourceId` goes on with `/slots/<slot>`, so it never matches.
 * KQL's endswith ignores case (az prints the id lowercased); quotes and backslashes are escaped, never interpreted. */
const siteFilter = (site?: string): string => (site ? ` | where _ResourceId endswith "/sites/${site.replace(/["\\]/g, '\\$&')}"` : '');

export function kql(signal: LogsSignal, since: string, site?: string): string {
  return `AppServiceHTTPLogs | where TimeGenerated >= datetime(${since})${siteFilter(site)} | summarize v=${AGG[signal]}, n=count() by timestamp=bin(TimeGenerated,1h)`;
}

/** The probe's question: how many HTTP requests the site served in the last day. */
export const count24h = (site?: string): string => `AppServiceHTTPLogs | where TimeGenerated > ago(1d)${siteFilter(site)} | count`;
