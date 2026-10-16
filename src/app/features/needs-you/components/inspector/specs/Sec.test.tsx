// The Show/Hide toggle names the section it controls, but only while that section's body is mounted (open).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { Sec } from '../Sec';

const demo = pickNeedsYouDemo();
const html = (open: boolean) => {
  const s = { ...initialState(demo), sections: { x: open } };
  return renderToStaticMarkup(
    <Sec k="x" title="Thing" def={false} p={{ s, dispatch: () => {} }}>
      body
    </Sec>,
  );
};

describe('Sec toggle', () => {
  it('open: aria-controls points at the section id', () => {
    const out = html(true);
    expect(out).toContain('id="insp-x"');
    expect(out).toMatch(/<button[^>]*aria-expanded="true"[^>]*aria-controls="insp-x"/);
  });

  it('closed: no aria-controls, since the body is not mounted', () => {
    const out = html(false);
    expect(out).toMatch(/<button[^>]*aria-expanded="false"/);
    expect(out).not.toContain('aria-controls');
  });
});
