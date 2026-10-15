// Who closed a merge request: GitLab's MR API (single MR and list) returns `closed_by` as a user object, null while the MR
// is open or merged. The mapper keeps the username, null when it is not stated, so the trial never guesses a closer.
import { describe, expect, it } from 'vitest';
import { mapMergeRequest } from '../adapter/mappersMr';

const RAW = {
  id: 500009, iid: 9, project_id: 90010001, title: 'chore(deps): bump', description: '', state: 'closed', draft: false,
  source_branch: 'b', target_branch: 'main', author: { username: 'ai-patcher-acme' }, labels: [], web_url: '', sha: null,
  created_at: '2026-10-08T10:00:00.000Z', updated_at: '2026-10-08T11:00:00.000Z', merged_at: null,
};

describe('mapMergeRequest: closed_by', () => {
  it('keeps the username GitLab names, and null when it names none', () => {
    expect(mapMergeRequest({ ...RAW, closed_by: { id: 4, username: 'dev-ana', name: 'Ana' } }).closedBy).toBe('dev-ana');
    expect(mapMergeRequest({ ...RAW, closed_by: null }).closedBy).toBeNull();
    expect(mapMergeRequest(RAW).closedBy).toBeNull();
    expect(mapMergeRequest({ ...RAW, closed_by: { id: 4 } }).closedBy).toBeNull();
  });
});
