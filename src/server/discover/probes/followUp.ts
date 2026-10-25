// The probe an ok probe makes possible: a query needs the id only a found resource carries (an App Insights appId, a
// workspace's customerId), so the model can never propose it up front. The server names it from the result; the
// wizard runs it next, through the same validation and seal as any other line.
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';

export function followUpOf(spec: ProbeSpec, result: ProbeResult): ProbeSpec | undefined {
  if (result.status !== 'ok' || !result.data) return undefined;
  const d = result.data;
  const sub: Record<string, string> = d.subscription ? { subscription: d.subscription } : {};
  if (spec.kind === 'az-loganalytics-workspace' && d.workspaceId && d.httpLogs !== 'no') {
    return { kind: 'az-loganalytics-query', args: { workspaceId: d.workspaceId, ...(spec.args.site ? { site: spec.args.site } : {}), ...sub } };
  }
  if (spec.kind === 'az-appinsights-component' && d.appId) return { kind: 'az-appinsights-query', args: { appId: d.appId } };
  return undefined;
}

const same = (a: ProbeSpec, b: ProbeSpec): boolean =>
  a.kind === b.kind && JSON.stringify(Object.entries(a.args).sort()) === JSON.stringify(Object.entries(b.args).sort());

/** The follow-up, unless an identical spec is already in the list. */
export function nextSpec(specs: readonly ProbeSpec[], spec: ProbeSpec, result: ProbeResult): ProbeSpec | undefined {
  const next = followUpOf(spec, result);
  return next && !specs.some((s) => same(s, next)) ? next : undefined;
}
