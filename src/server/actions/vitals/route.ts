// Which intents are a real project's writes, and the one gate they share before anything is planned: the hosted replay
// has no real project, and, like the collect, they act as the person's own login, so only a request addressed to this
// machine is answered (local.ts), in every mode.
import { parseIntent } from '../intents';
import { notLocal } from '../local';
import { PROJECT_KINDS, type ActionResponse, type ProjectIntent } from '../types';

/** The parsed project write, a refusal for one that does not validate, or null when the intent is not one. */
export function asProjectWrite(raw: unknown): { ok: true; intent: ProjectIntent } | { ok: false; response: ActionResponse } | null {
  const kind = typeof raw === 'object' && raw !== null ? (raw as { kind?: unknown }).kind : undefined;
  if (!PROJECT_KINDS.some((k) => k === kind)) return null;
  const p = parseIntent(raw);
  if (!p.ok) return { ok: false, response: { status: 'refused', reason: p.reason } };
  return { ok: true, intent: p.intent as ProjectIntent };
}

/** Why this request may not drive a project write, or null. */
export function projectAway(h: Pick<Headers, 'get'>, env: Record<string, string | undefined> = process.env): ActionResponse | null {
  if (env.BELAY_MODE === 'replay') return { status: 'refused', reason: 'the hosted replay has no real project to write to' };
  const reason = notLocal(h);
  return reason ? { status: 'refused', reason } : null;
}
