// Shared engine types. Every command returns a CommandResult; cli.ts prints it and maps it to an exit code.
export type ExitCode = 0 | 1 | 2;

export interface CommandResult {
  json: unknown; // stdout
  summary: string; // stderr, for humans
  code: ExitCode; // 0 pass, 1 fail, 2 inconclusive or error
  compact?: boolean; // one-line JSON (a ledger line), instead of the indented default
}

export interface Ctx {
  cwd: string;
  now: () => Date;
}

/** A problem with the input or the environment: the command stops with exit 2, never with a guess. */
export class EngineError extends Error {}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function str(v: unknown, what: string): string {
  if (typeof v !== 'string' || v === '') throw new EngineError(`${what} must be a non-empty string`);
  return v;
}

export function optStr(v: unknown, what: string): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new EngineError(`${what} must be a string`);
  return v;
}

export function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new EngineError(`${what} must be a number`);
  return v;
}

export function strList(v: unknown, what: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new EngineError(`${what} must be a list of strings`);
  return v as string[];
}

export function rec(v: unknown, what: string): Record<string, unknown> {
  if (!isRecord(v)) throw new EngineError(`${what} must be an object`);
  return v;
}

/** An ISO-8601 instant WITH its zone, as epoch ms. Date.parse alone also takes '10' and '3/4/2026', and reads a zone-less time in the machine's zone. */
const ISO_INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/;
/** Date.parse also rolls a day the month lacks into the next one (2026-02-31 reads as 2026-03-03): that day is refused. */
const dayExists = (v: string): boolean => {
  const [y, m, d] = v.slice(0, 10).split('-').map(Number) as [number, number, number];
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const isoInstantMs = (v: unknown): number => (typeof v === 'string' && ISO_INSTANT.test(v) && dayExists(v) ? Date.parse(v) : Number.NaN);
export function isoMs(v: unknown, what: string): number {
  const ms = isoInstantMs(v);
  if (Number.isNaN(ms)) throw new EngineError(`${what} must be an ISO time with a zone, like 2026-10-21T14:20:05Z`);
  return ms;
}
