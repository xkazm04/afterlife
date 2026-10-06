// belay-policy: trust-policy.yml and tier-state.yml, read through the port and validated by the engine's own parsers (the
// same rules the gate applies), so Belay and the gate can never read one file two ways.
import { parse } from 'yaml';
import type { TierState } from '@/schemas/tier';
import type { GitLabPort, ProjectRef } from '@/server/gitlab/port';
import { parsePolicy, parseState, type EnginePolicy } from '../../../../engine/policy/load';

export type PolicyRead = { ok: true; policy: EnginePolicy; state: TierState } | { ok: false; reason: string };

async function readYaml(port: GitLabPort, project: ProjectRef, file: string, ref: string): Promise<{ ok: true; value: unknown } | { ok: false; reason: string }> {
  const f = await port.getFile(project, file, ref);
  if (!f) return { ok: false, reason: `${file} is not in belay-policy at ${ref}` };
  try {
    return { ok: true, value: parse(f.content) as unknown };
  } catch (e) {
    return { ok: false, reason: `${file} is not valid YAML: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** A missing or malformed file is a reason, not an exception: the poller then leaves class tiers as they were. */
export async function readPolicy(port: GitLabPort, project: ProjectRef, ref: string): Promise<PolicyRead> {
  const [p, s] = await Promise.all([readYaml(port, project, 'trust-policy.yml', ref), readYaml(port, project, 'tier-state.yml', ref)]);
  if (!p.ok) return p;
  if (!s.ok) return s;
  try {
    return { ok: true, policy: parsePolicy(p.value), state: parseState(s.value) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
