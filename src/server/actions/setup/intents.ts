// /start's setup writes (server/start/wire.ts SetupIntent), validated field by field before anything is planned, and the
// one gate they share: they act on this machine (an installer, a terminal window, the settings file), so only a request
// addressed to this machine is answered (local.ts), in every mode, demo included: demo is when they are needed. The ask
// route (discover/ask) validates the assistant's proposal with this same parser, so it can propose nothing else.
import { notLocal } from '../local';
import type { ActionResponse } from '../types';
import { SETUP_KINDS, type SetSetup, type SetupIntent } from '@/server/start/wire';

export type SetupParse = { ok: true; intent: SetupIntent } | { ok: false; reason: string };
const no = (reason: string): SetupParse => ({ ok: false, reason });

/** A DNS hostname (labels of letters, digits and inner hyphens), no scheme, port or path: what glab --hostname takes. */
export const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const GROUP_ID = /^\d{1,20}$/;
const WORD = /^[A-Za-z0-9_.-]{1,100}$/;
const WORDS = /^[A-Za-z0-9_.-]+(?:\s*,\s*[A-Za-z0-9_.-]+)*$/;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Absent stays absent; present must match. null: present and wrong. */
const opt = (v: unknown, re: RegExp, max: number): string | undefined | null =>
  v === undefined ? undefined : typeof v === 'string' && v.trim().length <= max && re.test(v.trim()) ? v.trim() : null;

export const isSetupKind = (k: unknown): k is SetupIntent['kind'] => SETUP_KINDS.some((s) => s === k);

export function parseSetupIntent(raw: unknown): SetupParse {
  if (!isRec(raw)) return no('the intent is not an object');
  switch (raw.kind) {
    case 'install-glab':
      return { ok: true, intent: { kind: 'install-glab' } };
    case 'glab-login': {
      const host = opt(raw.host, HOSTNAME, 253);
      if (host === null) return no('host is a hostname (git.example.com), no scheme, port or path');
      return { ok: true, intent: { kind: 'glab-login', ...(host && host.toLowerCase() !== 'gitlab.com' ? { host: host.toLowerCase() } : {}) } };
    }
    case 'set-setup': {
      const groupId = typeof raw.groupId === 'string' && GROUP_ID.test(raw.groupId.trim()) ? raw.groupId.trim() : null;
      const mode = raw.mode === 'demo' || raw.mode === 'live' ? raw.mode : null;
      const host = opt(raw.host, HOSTNAME, 253);
      const project = opt(raw.project, WORD, 100);
      const proofAuthors = opt(raw.proofAuthors, WORDS, 400);
      if (!groupId) return no('groupId is the group\'s numeric id (digits only)');
      if (!mode) return no('mode is demo or live');
      if (host === null) return no('host is a hostname (git.example.com), no scheme, port or path');
      if (project === null) return no('project is the target project\'s path, its last segment (letters, digits, . _ -)');
      if (proofAuthors === null) return no('proofAuthors is a comma-separated list of usernames');
      const intent: SetSetup = {
        kind: 'set-setup', groupId, mode,
        ...(host ? { host: host.toLowerCase() } : {}), ...(project ? { project } : {}),
        ...(proofAuthors ? { proofAuthors: proofAuthors.split(',').map((a) => a.trim()).join(',') } : {}),
      };
      return { ok: true, intent };
    }
    default:
      return no(`unknown setup kind: one of ${SETUP_KINDS.join(', ')}`);
  }
}

/** The parsed setup write, a refusal for one that does not validate, or null when the intent is not one. */
export function asSetupWrite(raw: unknown): { ok: true; intent: SetupIntent } | { ok: false; response: ActionResponse } | null {
  if (!isSetupKind(isRec(raw) ? raw.kind : undefined)) return null;
  const p = parseSetupIntent(raw);
  return p.ok ? p : { ok: false, response: { status: 'refused', reason: p.reason } };
}

/** Why this request may not drive a setup write, or null: the hosted replay never, anything else only from this machine. */
export function setupAway(h: Pick<Headers, 'get'>, env: Record<string, string | undefined> = process.env): ActionResponse | null {
  if ((env.AFTERLIFE_MODE || env.BELAY_MODE) === 'replay') return { status: 'refused', reason: 'the hosted replay sets nothing up on its host' };
  const reason = notLocal(h);
  return reason ? { status: 'refused', reason } : null;
}
