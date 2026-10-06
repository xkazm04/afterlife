// Test helpers shared by the engine's vitest files. Not part of the engine, so not part of its pinned hash.
import path from 'node:path';
import type { Check, ProofBlock } from '../../src/schemas/proof';
import type { Io } from '../cli';
import { readInput } from '../core/files';
import type { Ctx } from '../core/types';
import { loadPolicy, loadState } from '../policy/load';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const NOW = new Date('2026-10-21T14:20:05Z');
export const ctx: Ctx = { cwd: ROOT, now: () => NOW };

export const fx = (...parts: string[]): string => path.join(ROOT, 'engine', '__fixtures__', ...parts);
export const fixture = (...parts: string[]): Record<string, unknown> => readInput(ctx, fx(...parts)) as Record<string, unknown>;
export const policy = () => loadPolicy(ctx, 'policy/trust-policy.yml');
export const state = () => loadState(ctx, 'policy/tier-state.yml');

export function checkOf(block: ProofBlock, name: string, claim?: string): Check {
  const c = block.checks.find((x) => x.name === name && (claim === undefined || x.claim_id === claim));
  if (!c) throw new Error(`no check ${name}${claim ? ` for ${claim}` : ''} in ${block.checks.map((x) => x.name).join(', ')}`);
  return c;
}

export function capture(cwd: string = ROOT): { io: Io; out: () => string; err: () => string; json: () => unknown } {
  let out = '';
  let err = '';
  return {
    io: { stdout: (s) => (out += s), stderr: (s) => (err += s), cwd, now: () => NOW },
    out: () => out,
    err: () => err,
    json: () => JSON.parse(out) as unknown,
  };
}
