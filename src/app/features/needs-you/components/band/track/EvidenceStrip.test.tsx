// The CRA band's evidence strip: one tick per evidence link. A tick is a check mark, so each carries its link's name for
// a screen reader (the hover title alone says nothing to one). No DOM here: the strip is rendered to markup.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EVIDENCE } from '../../../data/cra';
import { gradeIndex } from '../../../model/clock/grades';
import { EvidenceStrip } from './EvidenceStrip';

const out = renderToStaticMarkup(<EvidenceStrip resolved="6 / 6" />);

describe('the evidence strip', () => {
  it('names every tick after its link', () => {
    const named = [...out.matchAll(/<i [^>]*aria-label="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(named).toEqual(EVIDENCE.map((e) => `${e.what} · ${e.ref} · resolves`));
  });

  it('draws one tick per link', () => {
    expect(out.match(/<i /g)).toHaveLength(EVIDENCE.length);
  });

  it('lays the ticks out in as many columns as there are links, from the data and not from a number in the stylesheet', () => {
    expect(out).toContain(`--evd-n:${EVIDENCE.length}`);
    const css = readFileSync(new URL('./track.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/repeat\(\s*var\(--evd-n\)/);
    expect(css).not.toMatch(/repeat\(\s*\d/);
  });

  it('draws as many ticks resolved as the count says, the rest open', () => {
    const part = renderToStaticMarkup(<EvidenceStrip resolved="4 / 6" />);
    const labels = [...part.matchAll(/<i [^>]*aria-label="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(labels.filter((l) => l.endsWith('· resolves'))).toHaveLength(4);
    expect(labels.filter((l) => l.endsWith('· not resolved'))).toHaveLength(EVIDENCE.length - 4);
    expect(part.match(/✓/g)).toHaveLength(4);
  });

  it('draws no tick resolved when the count is not held', () => {
    const none = renderToStaticMarkup(<EvidenceStrip resolved="" />);
    expect(none).not.toContain('✓');
    expect(none).toContain('Evidence not held');
  });

  it('never draws every tick resolved while the count, and so the grade (draft), says a link is not', () => {
    const short = renderToStaticMarkup(<EvidenceStrip resolved={`${EVIDENCE.length} / ${EVIDENCE.length + 1}`} />);
    expect(short).toContain('· not resolved');
    expect(gradeIndex('open', `${EVIDENCE.length} / ${EVIDENCE.length + 1}`)).toBe(0);
  });
});
