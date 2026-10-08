// Where the per-install values of an arm MR come from. Live: the operator's environment, like the other BELAY_* settings;
// a value that is missing or malformed is named in the refusal, never filled in. Demo: the example's own values
// (gitlab/examples/target-project/.gitlab-ci.yml), planned against the fake group and never run.
import type { ArmPin } from './content';

export type ArmConfig = { ok: true; pin: ArmPin } | { ok: false; reason: string };

const VERSION = /^\d+\.\d+\.\d+$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const SHA = /^[0-9a-f]{40}$/;

/** The example's values: belay-pack 1.0.0, engine v0.1.0, pack and engine pins only: T4 names no consumer id (belay-apply's apply.json holds it, F4). Its all-zero engine_commit is a placeholder, so it is left out. */
export const DEMO_PIN: ArmPin = { packVersion: '1.0.0', engineRef: 'v0.1.0' };

export function readArmConfig(env: Record<string, string | undefined>): ArmConfig {
  const bad: string[] = [];
  const packVersion = env.BELAY_PACK_VERSION ?? '';
  const engineRef = env.BELAY_ENGINE_REF ?? '';
  const engineCommit = env.BELAY_ENGINE_COMMIT || undefined;
  if (!VERSION.test(packVersion)) bad.push('BELAY_PACK_VERSION (the belay-pack release, e.g. 1.0.0)');
  if (!REF.test(engineRef) || engineRef.includes('..')) bad.push('BELAY_ENGINE_REF (the engine tag, branch or SHA)');
  if (engineCommit !== undefined && !SHA.test(engineCommit)) bad.push('BELAY_ENGINE_COMMIT (40 hex digits, or unset)');
  if (bad.length) return { ok: false, reason: `set ${bad.join(' and ')} in Belay's environment: an arm MR names them and Belay will not guess them` };
  return { ok: true, pin: { packVersion, engineRef, ...(engineCommit ? { engineCommit } : {}) } };
}

