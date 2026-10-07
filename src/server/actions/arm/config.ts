// Where the per-install values of an arm MR come from. Live: the operator's environment, like the other BELAY_* settings;
// a value that is missing or malformed is named in the refusal, never filled in. Demo: the example's own values
// (gitlab/examples/target-project/.gitlab-ci.yml), planned against the fake group and never run.
import type { ArmPin } from './content';

export type ArmConfig = { ok: true; pin: ArmPin } | { ok: false; reason: string };

const VERSION = /^\d+\.\d+\.\d+$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const SHA = /^[0-9a-f]{40}$/;

/** The example's values: belay-pack 1.0.0, engine v0.1.0, guardrail consumer 4711. Its all-zero engine_commit is a placeholder, so it is left out. */
export const DEMO_PIN: ArmPin = { packVersion: '1.0.0', engineRef: 'v0.1.0', consumers: { guardrail: 4711 } };

/** The env variable that names a flow's consumer id. */
export const consumerVar = (flow: string): string => `BELAY_${flow.toUpperCase()}_CONSUMER_ID`;

export function readArmConfig(env: Record<string, string | undefined>): ArmConfig {
  const bad: string[] = [];
  const packVersion = env.BELAY_PACK_VERSION ?? '';
  const engineRef = env.BELAY_ENGINE_REF ?? '';
  const engineCommit = env.BELAY_ENGINE_COMMIT || undefined;
  const guardrail = Number(env[consumerVar('guardrail')]);
  if (!VERSION.test(packVersion)) bad.push('BELAY_PACK_VERSION (the belay-pack release, e.g. 1.0.0)');
  if (!REF.test(engineRef) || engineRef.includes('..')) bad.push('BELAY_ENGINE_REF (the engine tag, branch or SHA)');
  if (engineCommit !== undefined && !SHA.test(engineCommit)) bad.push('BELAY_ENGINE_COMMIT (40 hex digits, or unset)');
  if (bad.length) return { ok: false, reason: `set ${bad.join(' and ')} in Belay's environment: an arm MR names them and Belay will not guess them` };
  const consumers: Record<string, number> = Number.isSafeInteger(guardrail) && guardrail > 0 ? { guardrail } : {};
  return { ok: true, pin: { packVersion, engineRef, ...(engineCommit ? { engineCommit } : {}), consumers } };
}

