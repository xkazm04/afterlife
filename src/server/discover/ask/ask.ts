// "Ask Afterlife": one headless claude call per turn (no tools: the screen's state and the conversation are the whole
// input) that answers the person and may propose one action from the setup catalogue. The answer is read strictly: the
// action goes through the setup intents' own parser (actions/setup/intents.ts), so anything outside the catalogue is
// dropped and only the reply is kept. Like the proposal it runs from a fresh temp dir, never the repo, at low effort.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSetupIntent } from '@/server/actions/setup/intents';
import type { AskAnswer, AskTurn, SetupAction, StartSnapshot } from '@/server/start/wire';
import { callClaude, removeScratch } from '../../../../runner/agent/spawn';
import { ClaudeMissingError, jsonOf, type Call } from '../propose/propose';

export const ASK_TIMEOUT_MS = 90_000;
export const ASK_ENGINE = { model: 'claude-sonnet-5-5', effort: 'low' } as const;
export const MAX_TURNS = 12;
export const MAX_TURN_CHARS = 2000;
const MAX_REPLY = 600;
const MISSING = /not recognized as an internal or external command|ENOENT|command not found|cannot find the path|is not recognized/i;

/** The guide's prompt: src/server/discover/ask/ask.md, read from the app root on every call. */
export function loadAskPrompt(): string {
  const file = path.join(process.cwd(), 'src', 'server', 'discover', 'ask', 'ask.md');
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    throw new Error(`ask: the guide's prompt is missing (${path.relative(process.cwd(), file)})`);
  }
}

const cap = (v: unknown, n: number): string => (typeof v === 'string' ? v.slice(0, n) : '');

/** The last MAX_TURNS well-formed turns, each cut at MAX_TURN_CHARS. */
export function turnsOf(raw: unknown): AskTurn[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((t): t is { role: AskTurn['role']; text: string } => typeof t === 'object' && t !== null && (t.role === 'you' || t.role === 'afterlife') && typeof t.text === 'string')
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TURN_CHARS) }));
}

/** The screen's state, only its known fields, each bounded: it is shown to the model, never trusted. */
export function snapshotOf(raw: unknown): StartSnapshot {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const steps = (Array.isArray(r.steps) ? r.steps : []).slice(0, 12).map((s: Record<string, unknown> | null) => ({ key: cap(s?.key, 20), state: cap(s?.state, 20), line: cap(s?.line, 300) }));
  const platform = r.platform === 'windows' || r.platform === 'macos' ? r.platform : 'linux';
  return { steps, ...(typeof r.repo === 'string' ? { repo: cap(r.repo, 300) } : {}), host: cap(r.host, 253), groupId: cap(r.groupId, 40), mode: r.mode === 'live' ? 'live' : 'demo', platform };
}

/** The model's action, kept only when it is in the catalogue and validates; anything else is undefined. */
export function actionOf(raw: unknown): SetupAction | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  if ((raw as { kind?: unknown }).kind === 'save-project') return { kind: 'save-project' };
  const p = parseSetupIntent(raw);
  return p.ok ? p.intent : undefined;
}

/** The reply and the validated action of a model answer; text with no JSON object is the reply itself. */
export function answerOf(text: string): { reply: string; action?: SetupAction } {
  let v: unknown;
  try {
    v = jsonOf(text);
  } catch {
    return { reply: text.trim().slice(0, MAX_REPLY) || 'Afterlife had no answer: ask again.' };
  }
  const o = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const reply = typeof o.reply === 'string' && o.reply.trim() ? o.reply.trim().slice(0, MAX_REPLY) : 'Afterlife had no answer: ask again.';
  const action = actionOf(o.action);
  return action ? { reply, action } : { reply };
}

export function promptOf(turns: AskTurn[], state: StartSnapshot): string {
  const talk = turns.map((t) => `${t.role === 'you' ? 'Person' : 'Afterlife'}: ${t.text}`).join('\n\n');
  return `${loadAskPrompt()}\n\n## The screen's state\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n## The conversation\n\n${talk || '(the person has not written yet: greet them and name the next step)'}\n`;
}

export async function askAfterlife(rawTurns: unknown, rawState: unknown, call: Call = callClaude): Promise<AskAnswer> {
  const t0 = Date.now();
  const prompt = promptOf(turnsOf(rawTurns), snapshotOf(rawState));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-ask-'));
  let out;
  try {
    out = await call({ prompt, cwd, model: ASK_ENGINE.model, effort: ASK_ENGINE.effort, timeoutMs: ASK_TIMEOUT_MS, permissions: { step: 'reflect' } });
  } finally {
    removeScratch(cwd);
  }
  if (out.timedOut) throw new Error(`claude did not answer within ${ASK_TIMEOUT_MS / 1000} s`);
  if (out.exitCode !== 0 && !out.text && MISSING.test(out.stderr)) throw new ClaudeMissingError('claude is not on PATH: install Claude Code and log in (claude), or set AFTERLIFE_CLAUDE_BIN');
  if (out.isError || out.exitCode !== 0) throw new Error(`claude failed (exit ${out.exitCode}): ${(out.stderr || out.text).trim().split('\n')[0] ?? ''}`);
  return { ...answerOf(out.text), ms: Date.now() - t0 };
}
