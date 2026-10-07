'use server';

// Setup's "I merged it · verify", as a server action. A read: it never arms anything on its own, it reports whether the
// track's arm block is on the target's default branch (read.ts). Demo mode reads nothing and says it is simulated. Like
// the writes, live mode answers only a request addressed to this machine (local.ts): it reads as the operator.
import { headers } from 'next/headers';
import { actionDeps } from '../deps';
import { parseIntent } from '../intents';
import { notLocal } from '../local';
import { checkArm, SIMULATED_VERIFY, type ArmCheck } from './read';

export async function verifyArmAction(intent: unknown): Promise<ArmCheck> {
  const parsed = parseIntent(intent);
  if (!parsed.ok) return { status: 'refused', reason: parsed.reason };
  const i = parsed.intent;
  if (i.kind !== 'arm-track' && i.kind !== 'disarm-track') return { status: 'refused', reason: 'verify reads an arm or a disarm only' };
  const deps = actionDeps();
  if (!deps) return { status: 'refused', reason: 'live mode has not finished its first poll; try again in a moment' };
  if (deps.mode === 'demo') return { status: 'simulated', text: SIMULATED_VERIFY };
  const away = notLocal(await headers());
  return away ? { status: 'refused', reason: away } : checkArm(deps, i);
}
