// "Sent this session" lines are drawn on one line and cut with an ellipsis, so the full line has to be on the element
// (the staged cards do the same with their title).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { initialState } from '../../model/state';
import { OutboxDrawer } from './OutboxDrawer';

describe('OutboxDrawer', () => {
  it('puts each sent line in full on its own title', () => {
    const lines = ['ledgerline#131 · ready to sign', '!51 · Promote qa.file-bug to Hands-off with a very long title that will be cut'];
    const s = { ...initialState(pickNeedsYouDemo()), outboxOpen: true, sent: lines };
    const out = renderToStaticMarkup(<OutboxDrawer s={s} dispatch={() => {}} />);
    for (const l of lines) expect(out).toContain(`<div title="${l}">`);
  });
});
