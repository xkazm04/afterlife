// Narrowing helpers for untyped REST JSON. A missing required field is a 'parse' error, not a crash.
import { GitLabError } from '../errors';

export type Rec = Record<string, unknown>;

export function rec(v: unknown, what: string): Rec {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) return v as Rec;
  throw new GitLabError('parse', `${what}: expected an object`, what);
}

export function recs(v: unknown, what: string): Rec[] {
  if (!Array.isArray(v)) throw new GitLabError('parse', `${what}: expected an array`, what);
  return v.map((x) => rec(x, what));
}

const bad = (r: Rec, k: string, t: string): never => {
  throw new GitLabError('parse', `field "${k}" is not ${t}`, k);
};

export const str = (r: Rec, k: string): string => (typeof r[k] === 'string' ? (r[k] as string) : bad(r, k, 'a string'));
export const num = (r: Rec, k: string): number => (typeof r[k] === 'number' ? (r[k] as number) : bad(r, k, 'a number'));
export const strOr = (r: Rec, k: string, d: string): string => (typeof r[k] === 'string' ? (r[k] as string) : d);
export const strN = (r: Rec, k: string): string | null => (typeof r[k] === 'string' ? (r[k] as string) : null);
export const numN = (r: Rec, k: string): number | null => (typeof r[k] === 'number' ? (r[k] as number) : null);
export const bool = (r: Rec, k: string, d = false): boolean => (typeof r[k] === 'boolean' ? (r[k] as boolean) : d);
export const strs = (r: Rec, k: string): string[] => (Array.isArray(r[k]) ? (r[k] as unknown[]).filter((x): x is string => typeof x === 'string') : []);
/** Author of a note or MR: GitLab nests it as { author: { username } }. */
export const who = (r: Rec, k = 'author'): string => {
  const a = r[k];
  return a !== null && typeof a === 'object' ? strOr(a as Rec, 'username', 'unknown') : 'unknown';
};
