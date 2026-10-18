// The merge route of the fake (PUT merge_requests/:iid/merge): the only way a branch's commits reach its target branch.
// Belay never calls it - a person merges - so tests and the live-fake demo call it through `mergeMr`.
import type { ProjectRef } from '../types';
import type { BranchTree, ProjectData, Tree } from './dataset';
import type { FakeGitLab } from './fakeGitLab';
import { inProject } from './reads';
import { lastCommitOf, treeAt } from './refs';
import { fail, ok, type Route } from './server';

const P = 'projects/([^/]+)';

/** The files the branch changed since it started: their last commit differs from the one they had where it forked. */
const changedOn = (b: BranchTree): string[] => Object.keys(b.files).filter((f) => lastCommitOf(b, f) !== b.forked[f]);

/**
 * Fast-forwards the branch's changed files onto the target, each with its last commit and history. null when the target's
 * copy of one of them changed after the branch started (GitLab: the MR has conflicts), and then nothing is written.
 */
function apply(b: BranchTree, target: Tree): string[] | null {
  const paths = changedOn(b);
  const moved = (f: string): boolean => (target.files[f] === undefined ? undefined : lastCommitOf(target, f)) !== b.forked[f];
  if (paths.some(moved)) return null;
  for (const f of paths) {
    target.files[f] = b.files[f] ?? '';
    (target.fileCommits ??= {})[f] = lastCommitOf(b, f);
    if (b.history?.[f]) (target.history ??= {})[f] = structuredClone(b.history[f]);
    b.forked[f] = lastCommitOf(b, f);
  }
  return paths;
}

function dropBranch(p: ProjectData, name: string): void {
  if (p.refs) delete p.refs[name];
  if (p.branches) delete p.branches[name];
}

export const mergeRoutes: Route[] = [
  ['PUT', new RegExp(`^${P}/merge_requests/(\\d+)/merge$`), inProject((p, m, req) => {
    const mr = p.mrs.find((r) => String(r.iid) === m[2]);
    if (!mr) return fail(404, 'Merge Request Not Found');
    if (mr.state !== 'opened') return fail(405, 'Method Not Allowed');
    const source = String(mr.source_branch);
    const target = treeAt(p, String(mr.target_branch));
    const branch = p.refs?.[source];
    if (!target || (branch && !apply(branch, target))) return fail(406, 'Branch cannot be merged');
    const at = new Date().toISOString();
    Object.assign(mr, { state: 'merged', merged_at: at, updated_at: at, merge_commit_sha: p.branches?.[source] ?? null });
    if (req.fields.should_remove_source_branch === 'true' || mr.force_remove_source_branch === true) dropBranch(p, source);
    return ok(mr);
  })],
];

/** "The person merges": PUT .../merge_requests/:iid/merge through the fake's own glab, answering GitLab's status and body. */
export async function mergeMr(gl: FakeGitLab, project: ProjectRef, iid: number): Promise<{ status: number; body: unknown }> {
  const r = await gl.exec('glab', ['api', '--method', 'PUT', `projects/${encodeURIComponent(String(project))}/merge_requests/${iid}/merge`]);
  const status = r.code === 0 ? 200 : Number(/\(HTTP (\d+)\)/.exec(r.stderr)?.[1] ?? 500);
  return { status, body: JSON.parse(r.stdout) as unknown };
}
