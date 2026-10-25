// GET /api/onboard/repos: "Your repos", the git toplevels behind ~/.claude/projects (discover/listClaudeRepos, kept
// 60 s in the process), each marked when it is already onboarded. Loopback only (../answer.ts).
import { listClaudeRepos } from '@/server/discover';
import type { ReposAnswer } from '@/server/discover/wire';
import { messageOf } from '@/lib/format/error';
import { fail, ok, refuse } from '../answer';

export async function GET(req: Request): Promise<Response> {
  const refused = await refuse(req);
  if (refused) return refused;
  try {
    return ok({ repos: await listClaudeRepos() } satisfies ReposAnswer);
  } catch (e) {
    return fail('failed', `could not list your Claude Code repos: ${messageOf(e, { firstLine: true })}`);
  }
}
