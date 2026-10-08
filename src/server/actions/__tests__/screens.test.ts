// Every write the screens send plans in demo mode: the intents are built by the screens' own pure builders, sent through
// the same preview -> confirm path the buttons use, and confirmed as simulated (demo never executes).
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { revokeIntent } from '@/app/features/ladder/model/write';
import { makeCtx } from '@/app/features/maturity/model/ctx';
import { gapIntent } from '@/app/features/maturity/model/flow/intent';
import { intentFor } from '@/app/features/needs-you/model/intents';
import { actionDeps } from '../deps';
import { confirmIntent, previewIntent } from '../run';
import type { ActionIntent, ActionResponse } from '../types';

const deps = actionDeps({})!;
const gaps = makeCtx(DEMO.maturity, DEMO.stages).gaps;

async function roundTrip(intent: ActionIntent) {
  const p = await previewIntent(deps, intent);
  if (p.status !== 'preview') throw new Error(`${intent.kind}: ${JSON.stringify(p)}`);
  const c: ActionResponse = await confirmIntent(deps, intent, p.preview.previewId);
  return { preview: p.preview, confirmed: c };
}

describe('the screens send writes the server plans (demo: planned, never executed)', () => {
  it('Ladder: a revoke of a class the demo policy holds', async () => {
    const { preview, confirmed } = await roundTrip(revokeIntent('dep-bump.patch', 'supervised'));
    expect(preview).toMatchObject({ kind: 'revoke-class', mode: 'demo', risk: 'policy' });
    expect(preview.commands).toHaveLength(1);
    expect(preview.diff.some((l) => l.includes('supervised'))).toBe(true);
    expect(confirmed.status).toBe('done');
    if (confirmed.status === 'done') expect(confirmed.results.every((r) => r.simulated)).toBe(true);
  });

  it('Ladder: every class the screen offers a revoke for plans one step down', async () => {
    const { revokeTargets } = await import('@/app/features/ladder/model/rules/tiers');
    const refused: string[] = [];
    for (const c of DEMO.actionClasses) {
      const to = revokeTargets(c.tier)[0];
      if (!to) continue;
      const r = await previewIntent(deps, revokeIntent(c.id, to));
      if (r.status !== 'preview') refused.push(`${c.id}: ${r.status === 'refused' ? r.reason : r.status}`);
    }
    expect(refused).toEqual([]);
  });

  it('Ladder: raising a tier is refused (going up is a promotion MR)', async () => {
    const r = await previewIntent(deps, revokeIntent('code-fix.patch', 'hands_off'));
    expect(r.status).toBe('refused');
  });

  it('Maturity: every MR gap plans one commit per file and a draft MR; the probe sends nothing', async () => {
    for (const g of gaps) {
      const intent = gapIntent(g);
      if (g.x.kind === 'probe') {
        expect(intent).toBeNull();
        continue;
      }
      const { preview, confirmed } = await roundTrip(intent!);
      expect(preview.commands).toHaveLength(g.x.files.length + 1);
      expect(preview.commands.at(-1)?.display).toContain('merge_requests');
      expect(confirmed.status).toBe('done');
    }
  });

  it('Needs you: the dataset already holds dep-bump.patch at Hands-off, so the server refuses its promotion', async () => {
    const r = await previewIntent(deps, intentFor('n1', gaps)!);
    expect(r).toEqual({ status: 'refused', reason: 'dep-bump.patch is already hands_off: a promotion goes up' });
  });

  it('Needs you: the CRA sign-off and the re-admission each plan and settle their item', async () => {
    for (const key of ['n2', 'n4']) {
      const intent = intentFor(key, gaps)!;
      expect(intent.proposal).toBe(key);
      const { confirmed } = await roundTrip(intent);
      expect(confirmed.status).toBe('done');
    }
    expect(intentFor('n5', gaps)).toBeNull();
  });
});

describe('a gap MR only adds to an existing file', () => {
  it('keeps every line in order: additions pass, a dropped or a reordered line does not', async () => {
    const { keepsEveryLine } = await import('../plans/gap');
    const file = 'include:\n  - template: SAST\n  - template: Secrets\n';
    expect(keepsEveryLine(file, 'include:\n  - template: SAST\n  - template: Secrets\n  - local: x.yml\n')).toBe(true);
    expect(keepsEveryLine(file, 'include:\n  - local: x.yml\n')).toBe(false);
    expect(keepsEveryLine(file, '  - template: Secrets\ninclude:\n  - template: SAST\n')).toBe(false);
  });
});
