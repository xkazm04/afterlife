// accountFor's last source, the guardrail's notes: it reads one MR's notes at a time, and stops once two accounts have
// acted, since two is already a refusal. Same answer as reading every MR; fewer listNotes calls.
import { describe, expect, it } from 'vitest';
import { guardrailNote } from '@/server/gitlab/fake/demo/notes';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlMergeRequest, GlNote, GlProject } from '@/server/gitlab/types';
import type { PollerConfig } from '@/server/poller/config';
import type { TierState } from '@/schemas/tier';
import type { PlanContext } from '../../context';
import { accountFor } from '../account';

const NOW = new Date('2026-10-21T14:20:05Z');
const project = { id: 7, path: 'ledgerline' } as GlProject;
const state = { agents: {} } as unknown as TierState;
const mr = (iid: number): GlMergeRequest => ({ iid, labels: ['guardrail::block'], description: '', author: 'ai-patcher' }) as unknown as GlMergeRequest;
const note = (author: string): GlNote => ({ author, system: false, body: guardrailNote('block', 'abc', []) }) as unknown as GlNote;

/** 200 guardrail MRs; `actors[i]` is the account that left MR i's guardrail note (cycled). */
function rig(actors: readonly string[]) {
  let reads = 0;
  const port = {
    listMergeRequests: async () => Array.from({ length: 200 }, (_, i) => mr(i + 1)),
    listNotes: async (_: number, iid: number) => {
      reads += 1;
      return [note(actors[(iid - 1) % actors.length]!)];
    },
  } as unknown as GitLabPort;
  const cfg = {
    taskWindowMs: 3_600_000, mrLimit: 200, agents: { prefixes: [], names: [] }, guardrail: { prefixes: ['ai-guardrail'], names: [] },
  } as unknown as PollerConfig;
  const ctx = { port, cfg, now: NOW } as unknown as PlanContext;
  return { find: () => accountFor(ctx, project, 'guardrail', ['guard.block'], state), reads: () => reads };
}

describe('accountFor, the guardrail notes', () => {
  it('two accounts acting: a refusal naming both, after 2 note reads, not 200', async () => {
    const r = rig(['ai-guardrail-a', 'ai-guardrail-b']);
    const found = await r.find();
    expect(found).toEqual({ ok: false, reason: expect.stringContaining('names several accounts for the guardrail role (ai-guardrail-a, ai-guardrail-b)') });
    expect(r.reads()).toBe(2);
  });

  it('one account acting: that account, after reading every MR (a second could still be on the last one)', async () => {
    const r = rig(['ai-guardrail-a']);
    expect(await r.find()).toEqual({ ok: true, account: 'ai-guardrail-a', from: "ledgerline's merge requests" });
    expect(r.reads()).toBe(200);
  });
});
