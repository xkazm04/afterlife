// Every verdict the status line counts can be filtered to: the toolbar has an open button for the undetermined ones.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VerdictLozenge } from '../components/toolbar/VerdictLozenge';

const html = (value: 'all' | 'open') => renderToStaticMarkup(<VerdictLozenge counts={{ all: 5, pass: 2, fail: 1, open: 2 }} value={value} onChange={() => {}} />);

describe('VerdictLozenge', () => {
  it('offers all, pass, fail and open, with the open count', () => {
    const out = html('all');
    for (const word of ['all', 'pass', 'fail', 'open']) expect(out).toContain(`>${word}<`);
    expect(out).toMatch(/<button[^>]*title="Open only[^"]*"[^>]*><span[^>]*>2<\/span><span[^>]*>open<\/span>/);
  });
  it('marks open pressed when it is the filter', () => {
    expect(html('open')).toMatch(/<button[^>]*aria-pressed="true"[^>]*title="Open only/);
    expect(html('all')).toMatch(/<button[^>]*aria-pressed="false"[^>]*title="Open only/);
  });
});
