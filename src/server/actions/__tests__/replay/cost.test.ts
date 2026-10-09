// F92: on the hosted replay a preview is an anonymous endpoint. A new file's preview shows every line (F84), one diff row
// each, so its cost follows the line count, which had no bound of its own: 8 files of 64K newlines (inside Next's 1MB
// body limit) cost about 60 ms of CPU and a 4MB answer per call. A new file is now at most MAX_FILE_LINES lines, and the
// refusal names the bound. Every seeded gap the Maturity screen sends is still admitted.
import { describe, expect, it } from 'vitest';
import { getMaturity } from '@/lib/demo';
import { PROPOSAL_EXTRAS } from '@/app/features/maturity/data/proposals';
import { gapSend } from '@/app/features/maturity/write/gap';
import { actionDeps } from '../../deps';
import { MAX_FILE_LINES, parseIntent } from '../../intents';
import { previewIntent } from '../../run';

const gap = (content: string, n = 1) => ({
  kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 3, to: 4, title: 'A new job', branch: 'belay/gap-x',
  files: Array.from({ length: n }, (_, i) => ({ path: `.gitlab/belay/f${i}.yml`, content })),
});
const lines = (n: number) => 'a: 1\n'.repeat(n - 1) + 'a: 1';

describe('a new file in a gap MR is bounded by its lines, not only its characters', () => {
  it('admits a file of MAX_FILE_LINES lines', () => {
    expect(parseIntent(gap(lines(MAX_FILE_LINES))).ok).toBe(true);
  });

  it('refuses one line more, naming the bound, before anything is planned', async () => {
    expect(parseIntent(gap(lines(MAX_FILE_LINES + 1)))).toEqual({ ok: false, reason: `a new file is at most ${MAX_FILE_LINES} lines: .gitlab/belay/f0.yml has ${MAX_FILE_LINES + 1}` });
    const r = await previewIntent(actionDeps({ BELAY_MODE: 'replay' })!, gap('\n'.repeat(65_536), 8));
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringContaining(`at most ${MAX_FILE_LINES} lines`) });
  });

  it('admits every seeded gap the Maturity screen sends', () => {
    const sent = getMaturity().proposals.map((p) => gapSend('ledgerline', p, 'demo')).flatMap((s) => (s.ok ? [s.intent] : []));
    expect(sent.length).toBe(Object.values(PROPOSAL_EXTRAS).filter((x) => x.kind !== 'probe').length);
    for (const intent of sent) expect(parseIntent(intent)).toMatchObject({ ok: true });
  });
});
