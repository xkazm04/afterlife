// POST /api/onboard/probe { root, spec }: one probe of the wizard's checklist, so the checklist streams line by line.
// The spec is validated per kind (cleanSpec) before anything runs; the answer is the result and the server's seal
// over it, which the save step checks. A failed probe is a 200 with a `fail` result, not an error. Loopback only.
import { cleanSpec, runProbes, sealOf } from '@/server/discover';
import type { ProbeAnswer } from '@/server/discover/wire';
import { bodyOf, fail, ok, refuse, rootOf } from '../answer';

export async function POST(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  const body = await bodyOf(req);
  if (!body) return fail('bad-request', 'send a JSON object: { root, spec }');
  const spec = cleanSpec(body.spec);
  if (!spec) return fail('bad-request', 'not a probe Afterlife runs: an unknown kind, or args that kind does not take');
  const root = await rootOf(body);
  if (root instanceof Response) return root;
  const [result] = await runProbes([spec], root);
  if (!result) return fail('failed', 'the probe gave no result');
  return ok({ result, seal: sealOf(result, root) } satisfies ProbeAnswer);
}
