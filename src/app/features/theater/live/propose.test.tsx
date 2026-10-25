// A propose-only wave (`belay run --mode propose`) on the live film: its plan's items are "proposed", never a landed,
// parked or failed colour, and the header names the mode. An execute wave says EXECUTE and keeps its outcome words.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WAVE_1 } from '@/lib/runs/fixture';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from './model/meta';
import { selectLive } from './model/select';
import { waveKey, type LivePayload } from './model/types';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
const { LiveStage } = await import('./components/LiveStage');

const base = { v: 'belay.run/0', repo: 'grinex-portal', wave: 1, promptVersion: 'abc123abc123' };
const line = (o: Record<string, unknown>) => JSON.stringify({ ...base, ...o });
const START = line({ kind: 'wave.start', ts: '2026-10-25T10:00:00Z', mode: 'propose', base: 'initial/refactoring', lanes: 3, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet' });
const PLAN = line({ kind: 'wave.plan', ts: '2026-10-25T10:02:00Z', raw: 2, parsed: 2, items: ['dedupe-retry', 'cache-config'], ideas: [{ source: 'scan', count: 4 }] });
const USAGE = line({ kind: 'lane.usage', ts: '2026-10-25T10:02:00Z', lane: 'plan', model: 'sonnet', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.4 });
const END = line({ kind: 'wave.end', ts: '2026-10-25T10:02:01Z', branch: 'belay/wave-1', mergeable: false, branchKept: false, landed: 0, proposeOnly: true, costUsd: 0.4 });

const payload = (lines: string[]): LivePayload => {
  const evs = lines.map(parseRunLine).filter((e): e is RunEvent => e !== null);
  const w = foldWave(evs, false)!;
  return { ...foldRuns([w], 0), meta: { [waveKey(w.repo, w.wave)]: waveMetaOf(evs)! }, generatedAt: 0 };
};
const T = Date.parse('2026-10-25T10:02:05Z');
const draw = (lines: string[]) => renderToStaticMarkup(<LiveStage v={selectLive(payload(lines), T)} present={false} />);

describe('a propose-only wave', () => {
  it('while it plans: PROPOSE ONLY, planning, no outcome words', () => {
    const out = draw([START]);
    expect(out).toContain('PROPOSE ONLY');
    expect(out).toContain('Planning · grinex-portal wave 1 · propose only');
    expect(out).toContain('the plan has not answered yet');
    expect(out).not.toMatch(/landed|parked|failed/);
  });
  it('once planned and ended: its items are proposed, nothing changed', () => {
    const v = selectLive(payload([START, PLAN, USAGE, END]), T);
    expect(v).toMatchObject({ phase: 'last', proposeOnly: true, proposed: ['dedupe-retry', 'cache-config'] });
    const out = renderToStaticMarkup(<LiveStage v={v} present={false} />);
    expect(out).toContain('2 proposed · nothing changed');
    expect(out).toContain('aria-label="Proposed items"');
    expect(out.match(/>proposed</g)).toHaveLength(2);
    expect(out).toContain('dedupe-retry');
    expect(out).not.toMatch(/landed|parked|failed/);
  });
  it('an execute wave says EXECUTE and keeps its outcomes', () => {
    const out = renderToStaticMarkup(<LiveStage v={selectLive(payload(WAVE_1), T)} present={false} />);
    expect(out).toContain('EXECUTE');
    expect(out).not.toContain('PROPOSE ONLY');
    expect(out).toContain('landed');
  });
});
