// POST /api/onboard/propose { root, engine: 'sonnet' | 'haiku' }: the hybrid engine's proposal for the repo the path is
// in (discover/proposeProject: facts, one claude call, parseProposal). The client names an engine, never a model.
// A missing claude is a 503 `claude-missing`, an answer that is no proposal a 422 `invalid`. Loopback only.
import { AB_ENGINE, ciFiles, ClaudeMissingError, DEFAULT_ENGINE, ProposalError, proposeProject } from '@/server/discover';
import type { ProposeAnswer } from '@/server/discover/wire';
import { messageOf } from '@/lib/format/error';
import { bodyOf, fail, ok, refuse, rootOf } from '../answer';

export async function POST(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  const body = await bodyOf(req);
  if (!body) return fail('bad-request', 'send a JSON object: { root, engine }');
  if (body.engine !== undefined && body.engine !== 'sonnet' && body.engine !== 'haiku') return fail('bad-request', 'engine is "sonnet" or "haiku"');
  const root = await rootOf(body);
  if (root instanceof Response) return root;
  try {
    const r = await proposeProject(root, body.engine === 'haiku' ? AB_ENGINE : DEFAULT_ENGINE);
    return ok({ root, ...r, ciFiles: ciFiles(root) } satisfies ProposeAnswer);
  } catch (e) {
    if (e instanceof ClaudeMissingError) return fail('claude-missing', e.message);
    if (e instanceof ProposalError) return fail('invalid', e.message);
    return fail('failed', messageOf(e, { firstLine: true }));
  }
}
