// POST /api/start/derive { root }: what the repo's git remote says about where it lives on GitLab (host, namespace,
// project path) and the namespace's numeric id, read with one `glab api groups/<path>` (features/start/data/derive.ts).
// A remote that is not on GitLab, or a group glab cannot read, answers nulls with the reason. Loopback only.
import { messageOf } from '@/lib/format/error';
import { deriveDeps, deriveFor } from '@/app/features/start/data/derive';
import { bodyOf, fail, ok, refuse, rootOf } from '../../onboard/answer';

export async function POST(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  const body = await bodyOf(req);
  if (!body) return fail('bad-request', 'send a JSON object: { root }');
  const root = await rootOf(body);
  if (root instanceof Response) return root;
  try {
    return ok(await deriveFor(root, deriveDeps()));
  } catch (e) {
    return fail('failed', messageOf(e, { firstLine: true }));
  }
}
