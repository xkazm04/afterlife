// One read-only `az` call for the App Insights probes: run it, parse its JSON, and turn a non-zero exit into the
// one line a person reads plus the re-login command when the login lapsed. Never throws.
import type { ProbeKind, ProbeResult } from '@/schemas/vitals';
import { loginHint } from '../../exec';
import type { Exec } from '../../types';

export type AzOutcome = { ok: true; json: unknown; ms: number } | { ok: false; summary: string; ms: number };

/** The first stderr line that is not an az WARNING; the exit code when stderr is empty. */
export function firstErrorLine(stderr: string, code: number): string {
  const line = stderr.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^WARNING:/i.test(l));
  return line ?? `az exited ${code}`;
}

/** A failed az call as a summary: its first error line, then the re-login command when it is a login problem. */
export function failSummary(stderr: string, code: number): string {
  const hint = loginHint('az', stderr);
  const line = firstErrorLine(stderr, code);
  return hint ? `${line} - run \`${hint}\`` : line;
}

export async function runAz(exec: Exec, args: readonly string[], timeoutMs?: number): Promise<AzOutcome> {
  const r = await exec('az', args, { timeoutMs });
  if (r.code !== 0) return { ok: false, summary: failSummary(r.stderr, r.code), ms: r.ms };
  try {
    return { ok: true, json: r.stdout.trim() === '' ? null : JSON.parse(r.stdout), ms: r.ms };
  } catch {
    return { ok: false, summary: 'az returned output that is not JSON', ms: r.ms };
  }
}

/** `--subscription <s>` when one was given. */
export const subArgs = (subscription?: string): string[] => (subscription ? ['--subscription', subscription] : []);

export function result(kind: ProbeKind, args: Record<string, string>, status: ProbeResult['status'], summary: string, ms: number, data?: Record<string, string>): ProbeResult {
  return { kind, args, status, summary, ...(data ? { data } : {}), at: new Date().toISOString(), ms };
}
