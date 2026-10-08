// The demo desk's headline promotion (n1) must be previewable through the demo planner, and its card must tell the
// same story as the class's demo record measured against trust-policy's supervised_to_hands_off thresholds.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getActionClasses, getNeedsYou } from '@/lib/demo';
import { actionDeps } from '../../deps';
import { previewIntent } from '../../run';

const n1 = getNeedsYou().find((n) => n.id === 'n1');
const cls = getActionClasses().find((c) => c.id === n1?.title.split(' · ').at(-1));

function thresholds() {
  const line = /supervised_to_hands_off:\s*\{([^}]*)\}/.exec(readFileSync('policy/trust-policy.yml', 'utf8'))?.[1] ?? '';
  const num = (k: string) => Number(new RegExp(`${k}:\\s*([\\d.]+)`).exec(line)?.[1]);
  return { accepted: num('accepted'), noEdit: num('no_edit_ratio'), cleanDays: num('clean_days') };
}

describe('n1, the demo desk\'s headline promotion', () => {
  it('previews through the demo planner: the tier-state.yml commit on a belay/ branch and the belay::promotion MR', async () => {
    const deps = actionDeps({ BELAY_MODE: 'demo' });
    if (!deps || !n1?.to || !cls) throw new Error('demo deps, n1 or its class are missing');
    const r = await previewIntent(deps, { kind: 'promote-class', project: 'ledgerline', class: cls.id, to: n1.to, proposal: 'n1' });
    if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
    expect(r.preview.mode).toBe('demo');
    expect(r.preview.commands.some((c) => c.display.includes('tier-state.yml') && /belay\//.test(c.display))).toBe(true);
    expect(r.preview.commands.some((c) => c.argv.includes('labels=belay::promotion'))).toBe(true);
  });

  it('promotes from the class\'s own demo tier, and its rule values are the class record against the policy thresholds', () => {
    expect(n1?.from).toBe(cls?.tier);
    const t = thresholds();
    const rec = cls?.record;
    expect(rec).toBeTruthy();
    expect(rec?.accepted).toBeGreaterThanOrEqual(t.accepted);
    expect(rec?.noEdit).toBeGreaterThanOrEqual(t.noEdit);
    expect(rec?.cleanDays).toBeGreaterThanOrEqual(t.cleanDays);
    expect(n1?.rules).toEqual([
      [`accepted outputs ≥ ${t.accepted}`, String(rec?.accepted), true],
      [`merged without edits ≥ ${Math.round(t.noEdit * 100)} %`, `${Math.round((rec?.noEdit ?? 0) * 100)} %`, true],
      [`clean days ≥ ${t.cleanDays}`, String(rec?.cleanDays), true],
      ['mechanical proof class', 'repro', true],
    ]);
  });
});
