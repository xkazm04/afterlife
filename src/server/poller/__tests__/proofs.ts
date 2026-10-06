// A valid Proof Block, and the MR/notes around it, for the derivation tests.
import type { ProofBlock } from '@/schemas/proof';
import type { GlDeployment, GlMergeRequest, GlNote } from '@/server/gitlab/types';

export function goodProof(headSha?: string, taskId = '01J8Q4', mrIid = 41): ProofBlock {
  return {
    schema: 'belay.proof/1', id: '01J8Q4PROOF00000000000000', class: 'exploit-test',
    task: { flow: 'patcher', run_id: 'pipeline-1', project_id: 90010001, mr_iid: mrIid, ...(headSha ? { head_sha: headSha } : {}), trailer: `Belay-Task: ${taskId}` },
    claims: [{ id: 'c1', text: 'fixed it' }],
    checks: [
      { claim_id: 'c1', name: 'head-green', ok: true, detail: 'green', ref: 'job #1' },
      { claim_id: null, name: 'inside-envelope', ok: true, detail: '2 files' },
    ],
    evidence: [{ kind: 'job', ref: 'job #1' }],
    verdict: 'pass', envelope: { files: 2, lines: 14, paths_touched: ['a.ts'], within: true },
    engine: { version: 'v1', sha256: 'abc123' },
  };
}

export const SHA = 'f'.repeat(40);

export const mr = (over: Partial<GlMergeRequest> = {}): GlMergeRequest => ({
  id: 1, iid: 41, projectId: 90010001, title: 'Draft: Fix it', description: 'I fixed it.\n\nBelay-Task: 01J8Q4\nBelay-Class: dep-bump.patch',
  state: 'opened', draft: true, sourceBranch: 'b', targetBranch: 'main', author: 'ai-patcher-acme-lab', labels: ['belay::tier::supervised'],
  webUrl: '', sha: SHA, mergeStatus: null, createdAt: '2026-10-06T09:00:00.000Z', updatedAt: '2026-10-06T09:30:00.000Z', mergedAt: null, headPipelineId: null,
  ...over,
});

export const note = (author: string, body: string, id = 1, system = false): GlNote => ({ id, body, author, system, createdAt: `2026-10-06T09:${String(10 + id).padStart(2, '0')}:00.000Z` });

export const dep = (environment: string, sha = SHA, status = 'success'): GlDeployment => ({
  id: 1, iid: 1, status, ref: 'main', sha, environment, createdAt: '2026-10-06T09:50:00.000Z', updatedAt: '2026-10-06T09:50:00.000Z', deployableId: null,
});
