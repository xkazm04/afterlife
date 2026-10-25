// The onboard routes' one guard and answer shape. They act as the person's own claude, git and az logins and name
// local paths, so, as the live actions do (server/actions/local.ts), they answer only a request addressed to this
// machine; the hosted replay never runs them. Every answer is JSON, never stored by a cache.
import { connection } from 'next/server';
import { notLocal } from '@/server/actions/local';
import { toplevelOf } from '@/server/discover';
import type { OnboardError, OnboardErrorCode } from '@/server/discover/wire';

const NO_STORE = { 'cache-control': 'no-store' };

export const ok = (body: unknown): Response => Response.json(body, { headers: NO_STORE });

const STATUS: Record<OnboardErrorCode, number> = { 'not-local': 403, 'bad-request': 400, 'bad-root': 400, 'claude-missing': 503, invalid: 422, failed: 500 };

export const fail = (code: OnboardErrorCode, error: string): Response => Response.json({ error, code } satisfies OnboardError, { status: STATUS[code], headers: NO_STORE });

/** Request time (never the build), then the loopback check: a Response to send back when the request is refused. */
export async function refuse(req: Request): Promise<Response | null> {
  await connection();
  const why = notLocal(req.headers);
  return why ? fail('not-local', `${why}: onboarding runs only on your own machine`) : null;
}

/** The JSON object body, or null for anything else. */
export async function bodyOf(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await req.json();
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The git toplevel of the body's `root`, or the Response that says why there is none. */
export async function rootOf(body: Record<string, unknown>): Promise<string | Response> {
  if (typeof body.root !== 'string' || !body.root.trim()) return fail('bad-request', 'name the repo: { root: "<absolute path>" }');
  const top = await toplevelOf(body.root.trim());
  return top ?? fail('bad-root', `${body.root.trim()} is not an absolute path inside a git repository`);
}
