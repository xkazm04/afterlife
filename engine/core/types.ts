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
