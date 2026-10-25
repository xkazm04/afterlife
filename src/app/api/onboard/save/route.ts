// POST /api/onboard/save { root, engine, proposal, results: [{ result, seal }] }: the person's Save click. The proposal
// is validated again, only results this server sealed are kept, and confirmProject saves only the lines an ok probe
// confirmed, to <data>/projects/<slug>.yml. Answers the slug for /vitals/<slug>. Loopback only.
import { AB_ENGINE, DEFAULT_ENGINE, ProposalError, confirmProject, parseProposal, saveProject, verifySeal, type Sealed } from '@/server/discover';
import type { SaveAnswer } from '@/server/discover/wire';
import { messageOf } from '@/lib/format/error';
import { bodyOf, fail, ok, refuse, rootOf } from '../answer';

export async function POST(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  const body = await bodyOf(req);
  if (!body || !Array.isArray(body.results)) return fail('bad-request', 'send a JSON object: { root, engine, proposal, results }');
  const root = await rootOf(body);
  if (root instanceof Response) return root;
  try {
    const { proposal } = parseProposal(body.proposal);
    const sealed = body.results.filter((s: unknown): s is Sealed => verifySeal(s, root));
    const cfg = confirmProject(proposal, sealed.map((s) => s.result), root, body.engine === 'haiku' ? AB_ENGINE : DEFAULT_ENGINE, new Date());
    return ok({ slug: saveProject(cfg), unsealed: body.results.length - sealed.length } satisfies SaveAnswer);
  } catch (e) {
    if (e instanceof ProposalError) return fail('invalid', e.message);
    return fail('failed', `could not save the project: ${messageOf(e, { firstLine: true })}`);
  }
}
