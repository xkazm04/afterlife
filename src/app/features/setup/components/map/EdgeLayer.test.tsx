import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EdgeSpec } from '../../model/map/edges';
import { EdgeLayer } from './EdgeLayer';

// The server render of the whole screen never measures, so it draws no edge: this is the only place the edge classes are read.
const edge = (over: Partial<EdgeSpec>): EdgeSpec => ({ id: 'a>b', kind: 'step', d: 'M0 0 C1 0 2 1 3 1', met: false, hot: false, wait: false, unknown: false, ...over });
const paths = (edges: EdgeSpec[], dim = false) => {
  const html = renderToStaticMarkup(<EdgeLayer edges={edges} dim={dim} />);
  return { html, classes: [...html.matchAll(/<path class="([^"]*)" d="([^"]*)"/g)].map((m) => (m[1] ?? '').split(' ').sort()) };
};

describe('EdgeLayer', () => {
  it('draws one path per edge with its curve, and none for no edges', () => {
    expect(paths([]).classes).toEqual([]);
    const { html, classes } = paths([edge({ id: 'x' }), edge({ id: 'y', d: 'M5 5 C6 5 7 6 8 6' })]);
    expect(classes).toHaveLength(2);
    expect(html).toContain('d="M5 5 C6 5 7 6 8 6"');
  });
  it('maps each flag to its own class and leaves a plain edge with the base class only', () => {
    expect(paths([edge({})]).classes[0]).toHaveLength(1);
    const flags = [
      [{ met: true }, 'met'],
      [{ kind: 'dep' as const }, 'dep'],
      [{ unknown: true }, 'unk'],
      [{ hot: true }, 'hot'],
      [{ wait: true }, 'wait'],
    ] as const;
    for (const [over, name] of flags) {
      const cls = paths([edge(over)]).classes[0] ?? [];
      expect(cls, name).toHaveLength(2);
      expect(cls.some((c) => c.includes(name)), name).toBe(true);
    }
    expect(paths([edge({ kind: 'cap' })]).classes[0]).toHaveLength(1);
  });
  it('says whether something is lit on the svg (the dim flag), and is hidden from assistive tech', () => {
    expect(paths([edge({})], true).html).toContain('data-dim="true"');
    expect(paths([edge({})], false).html).toContain('data-dim="false"');
    expect(paths([edge({})]).html).toContain('aria-hidden="true"');
  });
});
