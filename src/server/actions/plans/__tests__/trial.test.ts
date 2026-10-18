// A promotion MR names the next rung's trial when the chain holds one: the seq range of its tier_decisions and the chain
// head (seq and hash) of the belay-ledger file, so an auditor can recompute it with one pasted `ledger trial` command. The write
// itself (the tier-state.yml commit) does not change, and without a trial the description is as before.
import { describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { GROUP_PATH } from '@/server/gitlab/fake/demo/ids';
import { appendLedgerEvents, readLedger } from '@/server/index/repositories/ledger/ledger';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { SEED_NOW } from '@/server/index/seed';
import { previewIntent } from '../../run';
import { liveRig } from '../../__tests__/rig';

const QA = `ai-qa-${GROUP_PATH}`;
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
const preview = async (deps: Awaited<ReturnType<typeof liveRig>>['deps']) => {
  const r = await previewIntent(deps, promote);
  if (r.status !== 'preview') throw new Error(r.status === 'refused' ? r.reason : r.status);
  return r.preview;
};
const description = (p: Awaited<ReturnType<typeof preview>>): string => {
  const argv = p.commands.find((c) => c.argv.includes('create') || c.display.includes('merge_requests'))?.argv ?? [];
  return argv.join('\n');
};

describe('planPromote: the trial in the MR description', () => {
  it('names the trial tier_decisions\' seq range and the chain head; the commit is the same as without them', async () => {
    const { db, deps } = await liveRig();
    const before = await preview(deps);
    expect(description(before)).not.toContain('Next-rung trial');

    const gid = (await getProjectRow(db, 'ledgerline'))?.gitlabId as number;
    const chain = await readLedger(db, gid);
    const last = chain.at(-1)!;
    const decision = (iid: number, would?: LedgerEvent['would']): Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'> => ({
      at: new Date(SEED_NOW.getTime() - 3_600_000).toISOString(), agent: QA, action_class: 'qa.file-bug', kind: 'tier_decision', tier_at_time: 'supervised',
      subject: { project_id: gid, type: 'mr', iid }, payload_ref: `x/${iid}`, observed_by: 'ci_job', ...(would ? { would } : {}),
    });
    const more: LedgerEvent[] = [];
    for (const [iid, would] of [[61, { tier: 'hands_off', decision: 'merge' }], [62, undefined], [63, { tier: 'hands_off', decision: 'merge' }]] as const) {
      more.push(append([...chain, ...more], decision(iid, would)));
    }
    await appendLedgerEvents(db, [...chain, ...more]);
    const after = await preview(deps);
    const head = more.at(-1)!;
    expect(description(after)).toContain(`Next-rung trial: 2 trial MR(s), tier_decision seq ${last.seq + 1}-${last.seq + 3} in belay-ledger events/${gid}.jsonl; chain head seq ${head.seq}, hash ${head.hash}.`);
    // the auditor's line is one runnable command, every value filled in: no input.json to hand-write
    const since = description(after).match(/--since (\S+)/)?.[1];
    expect(since).toBeDefined();
    expect(description(after)).toContain(`npx tsx engine/cli.ts ledger trial --chain events/${gid}.jsonl --through ${head.seq} --head ${head.hash} --agent ${QA} --class qa.file-bug --since ${since}`);
    expect(description(after)).not.toContain('<input.json>');
    // the write is unchanged: the same commit, the same diff
    expect(after.commands[0]?.argv).toEqual(before.commands[0]?.argv);
    expect(after.diff).toEqual(before.diff);
  });
});
