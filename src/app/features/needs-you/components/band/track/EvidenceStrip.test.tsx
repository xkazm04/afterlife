// The CRA band's evidence strip: one tick per evidence link. A tick is a check mark, so each carries its link's name for
// a screen reader (the hover title alone says nothing to one). No DOM here: the strip is rendered to markup.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EVIDENCE } from '../../../data/cra';
import { EvidenceStrip } from './EvidenceStrip';

const out = renderToStaticMarkup(<EvidenceStrip resolved="6 / 6" />);

describe('the evidence strip', () => {
  it('names every tick after its link', () => {
    const named = [...out.matchAll(/<i [^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(named).toEqual(EVIDENCE.map((e) => `${e.what} · ${e.ref} · resolves`));
  });

  it('draws one tick per link', () => {
    expect(out.match(/<i /g)).toHaveLength(EVIDENCE.length);
  });
});
