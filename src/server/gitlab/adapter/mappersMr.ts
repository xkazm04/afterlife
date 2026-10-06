// Raw GitLab REST JSON -> merge request types.
import type { GlDiff, GlMergeRequest, GlNote } from '../types';
import { bool, num, numN, str, strN, strOr, strs, who, type Rec } from './fields';

export const mapMergeRequest = (r: Rec): GlMergeRequest => ({
  id: num(r, 'id'), iid: num(r, 'iid'), projectId: num(r, 'project_id'), title: str(r, 'title'),
  description: strOr(r, 'description', ''), state: str(r, 'state'), draft: bool(r, 'draft', bool(r, 'work_in_progress')),
  sourceBranch: str(r, 'source_branch'), targetBranch: str(r, 'target_branch'), author: who(r),
  labels: strs(r, 'labels'), webUrl: strOr(r, 'web_url', ''), sha: strN(r, 'sha'),
  mergeStatus: strN(r, 'detailed_merge_status') ?? strN(r, 'merge_status'),
  createdAt: str(r, 'created_at'), updatedAt: str(r, 'updated_at'), mergedAt: strN(r, 'merged_at'),
  headPipelineId: r.head_pipeline && typeof r.head_pipeline === 'object' ? numN(r.head_pipeline as Rec, 'id') : null,
});

export const mapNote = (r: Rec): GlNote => ({
  id: num(r, 'id'), body: str(r, 'body'), author: who(r), system: bool(r, 'system'), createdAt: str(r, 'created_at'),
});

/** Counts +/- lines inside hunks. GitLab's diff text has no ---/+++ file headers, only hunks. */
export function countLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+')) added++;
    else if (line.startsWith('-')) removed++;
  }
  return { added, removed };
}

export const mapDiff = (r: Rec): GlDiff => {
  const diff = strOr(r, 'diff', '');
  return {
    oldPath: str(r, 'old_path'), newPath: str(r, 'new_path'), newFile: bool(r, 'new_file'),
    renamedFile: bool(r, 'renamed_file'), deletedFile: bool(r, 'deleted_file'), diff, ...countLines(diff),
  };
};
