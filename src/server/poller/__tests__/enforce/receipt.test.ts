// A live revoke, confirmed where the gate read it. The operator revokes dep-bump.patch through the live action (a commit
// to tier-state.yml on the demo GitLab): the Ladder's "Pending read" counts it. Each poll reads tier-state.yml's commit
// list and derives the class's receipt from the ledger's tier decisions (state_rev, written by belay-apply). A decision
// that read the revision before the revoke leaves it pending; one that read the revoke's commit settles it, with the delay
// and the withdrawn approval; one that read it and still decided hands_off raises the alarm.
import { describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ladderReducer } from '@/app/features/ladder/model/state/reducer';
import { initialState } from '@/app/features/ladder/model/state/initial';
import type { LadderAction, LadderState } from '@/app/features/ladder/model/state/state';
import { SMART_FILTERS } from '@/app/features/ladder/model/view/filters';
import { enforcementOf } from '@/app/features/ladder/model/enforcement/enforcement';
import { liveRig, policyFiles } from '@/server/actions/__tests__/rig';
import { confirmIntent, previewIntent } from '@/server/actions/run';
import { commitOf } from '@/server/actions/words';
import { actionClass } from '@/server/data/live/narrow';
import { ACCOUNT, LEDGERLINE_GID, POLICY_GID } from '@/server/gitlab/fake/demo/ids';
import { getActionClasses } from '@/server/index/views';
import { SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '../../config';
import { runPollCycle } from '../../cycle';
import { createMemory } from '../../state';

const CLS = 'dep-bump.patch';
const PATH = `events/${LEDGERLINE_GID}.jsonl`;
const pendingRead = SMART_FILTERS.find((f) => f.id === 'pending')!;

describe('a live revoke is confirmed where the gate read it', () => {
  it('pending until a tier_decision states its commit; the receipt says when, what was withdrawn, and an alarm', async () => {
    const { gl, db, deps } = await liveRig();
    const mem = createMemory();
    const poll = () => runPollCycle(gl.port, db, SEED_NOW, { cfg: readPollerConfig(144060371, {}), mem });
    const classes = async () => (await getActionClasses(db, 'ledgerline', SEED_NOW)).map(actionClass);
    const receipts = async () => Object.fromEntries((await getActionClasses(db, 'ledgerline', SEED_NOW)).flatMap((c) => (c.receipt ? [[c.id, c.receipt] as const] : [])));
    let s: LadderState = initialState({ classes: await classes(), ledger: [], quotes: {}, head: { sha: '?', by: '?' } });
    const run = (a: LadderAction) => (s = ladderReducer(s, a));
    const pending = () => s.classes.filter((c) => pendingRead.test(c, '', null)).length;
    const before = (await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.lastCommitId!;
    expect(pending()).toBe(0);

    // the revoke, as the Ladder sends it: preview, then confirm the same write
    const intent = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: CLS, to: 'supervised' }] };
    const preview = await previewIntent(deps, intent);
    if (preview.status !== 'preview') throw new Error(JSON.stringify(preview));
    const done = await confirmIntent(deps, intent, preview.preview.previewId);
    if (done.status !== 'done') throw new Error(JSON.stringify(done));
    const c1 = (await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.lastCommitId!;
    expect(policyFiles(gl)['tier-state.yml']).toContain('by: operator');
    run({ type: 'revoke', id: CLS, to: 'supervised', t: '14:24:30', sent: { simulated: false, commit: commitOf(done.results) } });
    expect(c1.startsWith(s.classes.find((c) => c.id === CLS)!.pending!)).toBe(true);
    expect(pending()).toBe(1);

    // the poll: tier-state.yml's commit list names c1 as the writer of the record; no gate has read it yet
    expect((await poll()).warnings.filter((w) => w.includes('history'))).toEqual([]);
    const fresh = (await receipts())[CLS]!;
    expect(fresh).toMatchObject({ commit: c1, readIid: null, readAt: null, delaySec: null, withdrew: [], alarm: null });
    run({ type: 'receipts', receipts: await receipts() });
    expect(pending()).toBe(1);
    expect(enforcementOf(s.classes.find((c) => c.id === CLS)!, true)?.facts.map((f) => f.text)).toEqual([c1.slice(0, 8), 'awaiting the next gated MR', 'nothing']);

    // the ledger gains tier decisions, as belay-apply writes them
    const ledgerFiles = gl.state.projects.find((p) => p.raw.name === 'belay-ledger')!.files;
    const after = (sec: number) => new Date(Date.parse(fresh.committedAt) + sec * 1000).toISOString();
    const decide = (iid: number, sec: number, extra: Partial<LedgerEvent>) => {
      const chain = (ledgerFiles[PATH] ?? '').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerEvent);
      const e = append(chain, {
        at: after(sec), agent: ACCOUNT.patcher, action_class: CLS, kind: 'tier_decision', tier_at_time: 'supervised',
        subject: { project_id: LEDGERLINE_GID, type: 'mr', iid }, payload_ref: `mr/${iid}`, observed_by: 'ci_job', ...extra,
      });
      ledgerFiles[PATH] = [...chain, e].map((x) => JSON.stringify(x)).join('\n') + '\n';
    };

    // a gate that read the revision before the revoke: not a read of the revoke, still pending
    decide(44, 30, { state_rev: before, tier_at_time: 'hands_off' });
    await poll();
    expect((await receipts())[CLS]).toMatchObject({ readIid: null, alarm: null, withdrew: [] });
    run({ type: 'receipts', receipts: await receipts() });
    expect(pending()).toBe(1);

    // the gate of !45 read c1: supervised, and the sweep withdrew the approval the old tier had given
    decide(45, 90, { state_rev: c1, withdrew: ['approval'] });
    await poll();
    expect((await receipts())[CLS]).toMatchObject({ commit: c1, readIid: 45, readAt: after(90), delaySec: 90, withdrew: [{ what: 'approval', iid: 45 }], alarm: null });
    run({ type: 'receipts', receipts: await receipts() });
    expect(pending()).toBe(0);
    expect(s.ledger.at(-1)).toMatchObject({ actor: 'tier-gate job', ids: [CLS], text: `!45's gate read tier-state.yml @ ${c1.slice(0, 8)}, 90 s after the commit` });
    expect(s.ledger.at(-1)?.chip).toBeUndefined();
    expect(enforcementOf(s.classes.find((c) => c.id === CLS)!, true)).toEqual({
      facts: [{ label: 'Committed', text: c1.slice(0, 8) }, { label: 'Read', text: 'at !45, 90 s after the commit' }, { label: 'Withdrawn', text: 'approval on !45' }],
      alarm: null, simulated: false,
    });

    // a gate that read c1 and still decided hands_off: the alarm
    decide(46, 120, { state_rev: c1, tier_at_time: 'hands_off' });
    await poll();
    expect((await receipts())[CLS]).toMatchObject({ readIid: 45, alarm: { iid: 46, tier: 'hands_off', at: after(120) } });
    run({ type: 'receipts', receipts: await receipts() });
    expect(enforcementOf(s.classes.find((c) => c.id === CLS)!, true)?.alarm).toBe("!46's gate granted Hands-off after the commit");
  }, 120_000);
});
