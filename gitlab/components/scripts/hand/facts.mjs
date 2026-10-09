// What both scripts of the M1 hand-run (../../README.md, "M1: report-only, writes by hand") read about one MR, with the
// operator's own glab login: the MR, its project, its diff from base to head (the compare API, as belay-apply reads it)
// and whether it changes its own CI configuration, by belay-apply's rule (../../../apply/ci-touch.mjs, F68). Reads only.
// Needs `yaml` from the Belay checkout's node_modules (ci-touch.mjs parses the CI file), as belay-apply does.
import { touchesCi } from '../../../apply/ci-touch.mjs';
import { api, die } from '../lib/lib.mjs';
import { readFile } from '../lib/repo-write.mjs';

const SHA = /^[0-9a-f]{40}$/;

/** The MR's diff as one unified diff, from the compare API; a truncated diff is refused. sweep.mjs's diffOf, verbatim. */
export function diffOf(projectId, base, head) {
  const c = api(`projects/${projectId}/repository/compare?from=${base}&to=${head}&straight=false`);
  if (!c || !Array.isArray(c.diffs)) throw new Error('the compare API gave no diffs');
  if (c.compare_timeout) throw new Error('GitLab timed out comparing the MR: its diff is incomplete');
  const parts = [];
  for (const d of c.diffs) {
    if (d.too_large || d.collapsed) throw new Error(`the diff of ${d.new_path} is too large for GitLab to return: incomplete`);
    const a = d.new_file ? '/dev/null' : `a/${d.old_path}`;
    const b = d.deleted_file ? '/dev/null' : `b/${d.new_path}`;
    parts.push(`diff --git a/${d.old_path} b/${d.new_path}\n${d.new_file ? 'new file mode 100644\n' : ''}${d.deleted_file ? 'deleted file mode 100644\n' : ''}--- ${a}\n+++ ${b}\n${String(d.diff ?? '').replace(/\n?$/, '\n')}`);
  }
  return { text: parts.join(''), changed: c.diffs.flatMap((d) => [d.old_path, d.new_path]) };
}

/**
 * `{project, mr, head, base, diff, refusal}`. `refusal` is null, or why belay-apply would give this MR nothing: it targets
 * another branch than the default one (F78), or it changes its own CI configuration (F68: such an MR chose which jobs made
 * its evidence). A failed read throws: unknown, never "no change".
 */
export function mrFacts(projectId, iid) {
  const project = api(`projects/${projectId}`);
  const mr = api(`projects/${projectId}/merge_requests/${iid}`);
  const head = String(mr?.diff_refs?.head_sha ?? mr?.sha ?? '');
  const base = String(mr?.diff_refs?.base_sha ?? '');
  if (!SHA.test(head) || !SHA.test(base)) die(`MR !${iid} has no usable diff_refs`);
  const { text, changed } = diffOf(projectId, base, head);
  let refusal = null;
  if (!project?.default_branch || mr.target_branch !== project.default_branch) {
    refusal = `it targets ${mr.target_branch}, not the default branch ${project?.default_branch ?? '(unknown)'}`;
  } else {
    const ci = touchesCi({
      changed,
      project: { path_with_namespace: project.path_with_namespace, ci_config_path: project.ci_config_path ?? null },
      readAt: (p) => readFile(projectId, p, head),
    });
    if (ci) refusal = `${ci}. This MR controls which jobs made its evidence`;
  }
  return { project, mr, head, base, diff: text, refusal };
}
