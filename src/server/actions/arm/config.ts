// Where the per-install values of an arm MR come from. Live: the operator's environment, like the other AFTERLIFE_* settings;
// a value that is missing or malformed is named in the refusal, never filled in. AFTERLIFE_PROOF_AUTHORS is optional here:
// only T3's arm names it, and T3 refuses without it (content/governor.ts). Demo: the example's own values
// (gitlab/examples/target-project/.gitlab-ci.yml), planned against the fake group and never run.
import { envOf } from '@/server/env/env';
import type { ArmPin } from './content';

export type ArmConfig = { ok: true; pin: ArmPin } | { ok: false; reason: string };

const VERSION = /^\d+\.\d+\.\d+$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const SHA = /^[0-9a-f]{40}$/;
const USER = /^[A-Za-z0-9_.][A-Za-z0-9_.-]{0,254}$/;

/**
 * The example's values: belay-pack 1.0.0, engine v0.1.0 and tier-gate's proof_authors belay-bot (belay-apply's bot). T4
 * names no consumer id (belay-apply's apply.json holds it, F4). Its all-zero engine_commit is a placeholder, so it is left out.
 * belay-bot is a wire name: the example's bot account, as GitLab knows it.
 */
export const DEMO_PIN: ArmPin = { packVersion: '1.0.0', engineRef: 'v0.1.0', proofAuthors: 'belay-bot' };

/** AFTERLIFE_PROOF_AUTHORS as the poller reads it (comma-separated, src/server/poller/config.ts), written back without spaces. */
const authorsOf = (v: string | undefined): string[] => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function readArmConfig(env: Record<string, string | undefined>): ArmConfig {
  const bad: string[] = [];
  const packVersion = envOf(env, 'PACK_VERSION') ?? '';
  const engineRef = envOf(env, 'ENGINE_REF') ?? '';
  const engineCommit = envOf(env, 'ENGINE_COMMIT');
  const authors = authorsOf(envOf(env, 'PROOF_AUTHORS'));
  if (!VERSION.test(packVersion)) bad.push('AFTERLIFE_PACK_VERSION (the belay-pack release, e.g. 1.0.0)');
  if (!REF.test(engineRef) || engineRef.includes('..')) bad.push('AFTERLIFE_ENGINE_REF (the engine tag, branch or SHA)');
  if (engineCommit !== undefined && !SHA.test(engineCommit)) bad.push('AFTERLIFE_ENGINE_COMMIT (40 hex digits, or unset)');
  if (!authors.every((u) => USER.test(u))) bad.push('AFTERLIFE_PROOF_AUTHORS (GitLab usernames, comma-separated, or unset)');
  if (bad.length) return { ok: false, reason: `set ${bad.join(' and ')} in Afterlife's environment: an arm MR names them and Afterlife will not guess them` };
  return { ok: true, pin: { packVersion, engineRef, ...(engineCommit ? { engineCommit } : {}), ...(authors.length ? { proofAuthors: authors.join(',') } : {}) } };
}

