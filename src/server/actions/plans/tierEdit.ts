// Reading and editing tier-state.yml for a policy write (revoke, promote, enroll). The read: belay-policy's default branch,
// once, so the decision and the edit share it, with the last_commit_id the write carries. The edit, the way the tripwire
// does it: the document is parsed with comments kept, one record is replaced as a flow mapping, and the file is written
// back. Only the records named change.
import { parseDocument, Scalar, type YAMLMap } from 'yaml';
import type { GlFile, GlProject } from '@/server/gitlab/types';
import { readPolicy, type PolicyRead } from '@/server/poller/derive/policy';
import { ActionRefused, lastCommitOf, type PlanContext } from './context';

export interface TierStateRead {
  /** belay-policy's default branch: the branch read, and the base a policy MR starts from. */
  base: string;
  file: GlFile;
  read: Extract<PolicyRead, { ok: true }>;
  lastCommitId: string;
}

/** tier-state.yml and trust-policy.yml on belay-policy's default branch, read once; refused in one wording when they cannot be. */
export async function readTierState(ctx: Pick<PlanContext, 'port'>, repo: GlProject): Promise<TierStateRead> {
  const base = repo.defaultBranch ?? 'main';
  const file = await ctx.port.getFile(repo.id, 'tier-state.yml', base);
  const read = await readPolicy(ctx.port, repo.id, base, file);
  if (!read.ok) throw new ActionRefused(`Afterlife could not read belay-policy: ${read.reason}`);
  if (!file) throw new ActionRefused('Afterlife could not read belay-policy: tier-state.yml is not in it'); // readPolicy refuses a missing file first
  return { base, file, read, lastCommitId: lastCommitOf(file) };
}

export interface RecordEdit {
  agent: string;
  class: string;
  record: Record<string, string>;
}

const DATE = /^\d{4}-\d{2}-\d{2}/;

export function editRecords(text: string, edits: readonly RecordEdit[]): string {
  const doc = parseDocument(text);
  if (doc.errors.length) throw new Error(`tier-state.yml is not valid YAML: ${doc.errors[0]?.message}`);
  for (const e of edits) {
    const node = doc.createNode(e.record) as YAMLMap;
    node.flow = true;
    for (const pair of node.items) {
      if (pair.value instanceof Scalar && typeof pair.value.value === 'string' && DATE.test(pair.value.value)) pair.value.type = 'QUOTE_DOUBLE';
    }
    doc.setIn(['agents', e.agent, e.class], node);
  }
  return doc.toString({ lineWidth: 0 });
}

/** "- old" / "+ new" for every line that differs, with the line above it for context when it is a key. */
export function lineDiff(before: string, after: string): string[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length !== b.length) { // lines added (an enrollment's new records) or removed: only what lies between the common ends
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head]) head++;
    let tail = 0;
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
    return [...a.slice(head, a.length - tail).map((l) => `- ${l}`), ...b.slice(head, b.length - tail).map((l) => `+ ${l}`)];
  }
  return b.flatMap((line, i) => (line === a[i] ? [] : [`- ${a[i]}`, `+ ${line}`]));
}
