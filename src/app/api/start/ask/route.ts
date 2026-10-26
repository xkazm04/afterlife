// POST /api/start/ask { turns, state }: one turn of "Ask Afterlife" (server/discover/ask): a reply of a few sentences and
// at most one action from the setup catalogue, which the server validated with the intents' own parser; the wizard shows
// it as a card the person confirms through previewAction / confirmAction. A missing claude is a 503 `claude-missing`.
// Loopback only: it runs the person's own claude login.
import { askAfterlife } from '@/server/discover/ask/ask';
import { ClaudeMissingError } from '@/server/discover';
import { messageOf } from '@/lib/format/error';
import { bodyOf, fail, ok, refuse } from '../../onboard/answer';

export async function POST(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  const body = await bodyOf(req);
  if (!body || !Array.isArray(body.turns) || typeof body.state !== 'object' || body.state === null) return fail('bad-request', 'send a JSON object: { turns: [{ role, text }], state }');
  try {
    return ok(await askAfterlife(body.turns, body.state));
  } catch (e) {
    if (e instanceof ClaudeMissingError) return fail('claude-missing', e.message);
    return fail('failed', messageOf(e, { firstLine: true }));
  }
}
