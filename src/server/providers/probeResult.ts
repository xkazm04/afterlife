// What every provider adapter shares: building a ProbeResult, turning a failed CLI call into a `fail` probe that names
// the re-login command, the error that carries such a probe out of listRuns, and a small concurrency pool.
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';
import { loginHint } from './exec';

/** One probe outcome, timed from `t0` (Date.now() when the probe started). */
export function probeResult(spec: ProbeSpec, t0: number, status: ProbeResult['status'], summary: string, data?: Record<string, string>): ProbeResult {
  const r: ProbeResult = { kind: spec.kind, args: { ...spec.args }, status, summary, at: new Date().toISOString(), ms: Date.now() - t0 };
  if (data && Object.keys(data).length) r.data = data;
  return r;
}

const firstLine = (s: string): string => s.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^WARNING:/i.test(l)) ?? '';

/** The one line a person reads for a failed call: stderr's first line, then the re-login command when the login lapsed
 * or the binary could not start (code 127: install it, then log in). */
export function failSummary(bin: 'az' | 'glab', r: { code: number; stderr: string; stdout?: string }): string {
  const line = firstLine(r.stderr) || firstLine(r.stdout ?? '') || `${bin} exited ${r.code}`;
  const login = bin === 'az' ? 'az login' : 'glab auth login';
  if (r.code === 127) return `${line} - install ${bin}, then run \`${login}\``;
  const hint = loginHint(bin, r.stderr);
  return hint ? `${line} - run \`${hint}\`` : line;
}

/** Thrown by listRuns so its caller can record the failure as a probe; the collector catches it, never the person. */
export class ProviderError extends Error {
  constructor(readonly probe: ProbeResult) {
    super(probe.summary);
    this.name = 'ProviderError';
  }
}

/** JSON from a CLI's stdout; undefined for empty output or text that is not JSON. */
export function parseJson(stdout: string): unknown {
  if (!stdout.trim()) return undefined;
  try {
    return JSON.parse(stdout);
  } catch {
    return undefined;
  }
}

/** Runs `fn` over `items` with at most `limit` in flight; the results keep the input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** An ISO instant in one form (Azure writes 7 fraction digits, GitLab 3); undefined for anything unparseable. */
export function iso(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v) return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export const shortBranch = (ref: string): string => ref.replace(/^refs\/heads\//, '');
