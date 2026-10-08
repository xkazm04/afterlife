// Puts a fake GitLab in the state a person leaves after Setup's human steps, as Setup reads them (src/server/data/setup):
// the projects step 4 creates, a gitlab--duo runner (6), belay-apply's settings that hold no secret (8) and the merged
// bootstrap MR with the agent config on the target's default branch (10). For tests and the live-mode demo; [R] shapes.
import type { Rec } from '../adapter/fields';
import { project, type ProjectData } from './dataset';
import type { FakeGitLab } from './fakeGitLab';

/** The fake's project by name, or the one step 4 would create under the group, added now. */
export function projectNamed(gl: FakeGitLab, name: string): ProjectData {
  const found = gl.state.projects.find((p) => p.raw.name === name);
  if (found) return found;
  const ns = String(gl.state.group.full_path ?? gl.state.group.path);
  const raw: Rec = {
    id: gl.state.nextId++, name, path: name, path_with_namespace: `${ns}/${name}`, default_branch: 'main',
    web_url: `https://gitlab.com/${ns}/${name}`, visibility: 'private', archived: false,
  };
  const p = project(raw);
  gl.state.projects.push(p);
  return p;
}

export const BELAY = ['belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine', 'belay-apply'] as const;

/** Step 4: every belay project exists. */
export const createBelayProjects = (gl: FakeGitLab): ProjectData[] => BELAY.map((n) => projectNamed(gl, n));

/** Step 6: one runner tagged gitlab--duo, online, available to the target. */
export function addRunner(gl: FakeGitLab, target: string, o: { online?: boolean } = {}): void {
  const online = o.online ?? true;
  const p = projectNamed(gl, target);
  p.runners = [...(p.runners ?? []), { id: 4401, description: 'duo runner', runner_type: 'project_type', paused: false, is_shared: false, online, status: online ? 'online' : 'offline', tag_list: ['gitlab--duo', 'docker'] }];
}

/** Step 8, the parts Setup reads: belay-apply's minimum role for pipeline variables and an active schedule on main. */
export function setApplySettings(gl: FakeGitLab, o: { role?: string; schedule?: boolean } = {}): void {
  const apply = projectNamed(gl, 'belay-apply');
  apply.raw.ci_pipeline_variables_minimum_override_role = o.role ?? 'no_one_allowed';
  if (o.schedule ?? true) apply.schedules.push({ id: 31, description: 'belay sweep', ref: 'main', cron: '*/10 * * * *', active: true, next_run_at: null });
}

/** Step 10: the bootstrap MR (`merged` false: still open) and, once merged, the agent config on the default branch. */
export function addBootstrap(gl: FakeGitLab, target: string, o: { merged?: boolean } = {}): void {
  const merged = o.merged ?? true;
  const p = projectNamed(gl, target);
  p.mrs.unshift({
    id: 590002, iid: 2, project_id: p.raw.id, title: 'belay: bootstrap', description: '', state: merged ? 'merged' : 'opened', draft: false,
    source_branch: 'belay/bootstrap', target_branch: 'main', author: { username: 'kazdanm' }, labels: [], web_url: `${String(p.raw.web_url)}/-/merge_requests/2`,
    sha: 'b007000000000000000000000000000000000002', created_at: '2026-10-08T08:00:00.000Z', updated_at: '2026-10-08T08:30:00.000Z',
    merged_at: merged ? '2026-10-08T08:30:00.000Z' : null, head_pipeline: null,
  });
  if (merged) p.files['.gitlab/duo/agent-config.yml'] = 'image: node:22\n';
}

/** Steps 4, 6, 8 (its readable parts) and 10 as a person leaves them. */
export function finishHumanSteps(gl: FakeGitLab, target: string): void {
  createBelayProjects(gl);
  addRunner(gl, target);
  setApplySettings(gl);
  addBootstrap(gl, target);
}
