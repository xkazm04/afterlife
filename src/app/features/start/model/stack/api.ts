// /start's calls: the stack's propose and per-line probe (/api/onboard/*, unchanged), the save (/api/start/save, the
// same body), the repo's derive and the assistant's turn (/api/start/*). Each answers its body or an OnboardError; a
// network failure or a body that is not JSON is a `failed` error with what went wrong, never a throw.
import type { ProbeSpec, Proposal } from '@/schemas/vitals';
import type { EngineKey, OnboardError, ProbeAnswer, ProposeAnswer, SaveAnswer } from '@/server/discover/wire';
import type { AskAnswer, AskTurn, DeriveAnswer, StartSnapshot } from '@/server/start/wire';

export type Answer<T> = { ok: true; body: T } | { ok: false; error: OnboardError };

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<Answer<T>> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal, cache: 'no-store' });
    const json: unknown = await res.json();
    if (res.ok) return { ok: true, body: json as T };
    const e = json as Partial<OnboardError>;
    return { ok: false, error: { code: e.code ?? 'failed', error: e.error ?? `${url} answered ${res.status}` } };
  } catch (e) {
    return { ok: false, error: { code: 'failed', error: e instanceof Error ? e.message : String(e) } };
  }
}

export const propose = (root: string, engine: EngineKey, signal?: AbortSignal) => post<ProposeAnswer>('/api/onboard/propose', { root, engine }, signal);

export const probe = (root: string, spec: ProbeSpec, signal?: AbortSignal) => post<ProbeAnswer>('/api/onboard/probe', { root, spec }, signal);

export const save = (root: string, engine: EngineKey, proposal: Proposal, results: ProbeAnswer[]) => post<SaveAnswer>('/api/start/save', { root, engine, proposal, results });

export const derive = (root: string, signal?: AbortSignal) => post<DeriveAnswer>('/api/start/derive', { root }, signal);

export const ask = (turns: readonly AskTurn[], state: StartSnapshot, signal?: AbortSignal) => post<AskAnswer>('/api/start/ask', { turns, state }, signal);
