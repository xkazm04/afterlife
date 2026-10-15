// The Evidence card's per-rung count says how many linked objects it lists. A rung with no objects to list (live mode,
// where the scan's one-line note stands in, or a rung this session's rescan credited) must not claim "1 object".
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { EvidenceSection } from './inspector/EvidenceSection';
import { makeCtx } from '../model/ctx';

vi.mock('@/components/overlays/toast/useToast', () => ({ useToast: () => ({ toast: () => {}, status: () => {}, statusMessage: '' }) }));

const html = (mode: 'demo' | 'live', now: number) => {
  const ctx = makeCtx(DEMO.maturity, DEMO.stages, { mode });
  return renderToStaticMarkup(createElement(EvidenceSection, { ctx, stage: 'verify', now }));
};
const counts = (h: string): string[] => [...h.matchAll(/(\d+) objects?</g)].map((m) => m[0]);

describe('Evidence per-rung object count', () => {
  it('live mode lists no objects, so no rung claims one', () => {
    expect(counts(html('live', 2))).toEqual([]);
    expect(html('live', 2)).toContain('no links');
  });
  it('demo mode counts the objects it lists', () => {
    const h = html('demo', 2);
    const listed = (h.match(/↗/g) ?? []).length;
    const claimed = counts(h).reduce((a, c) => a + Number(c.match(/\d+/)?.[0]), 0);
    expect(listed).toBeGreaterThan(0);
    expect(claimed).toBe(listed);
  });
});
