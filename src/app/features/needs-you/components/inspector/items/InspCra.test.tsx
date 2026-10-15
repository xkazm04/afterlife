// The detail page's "Ready to sign" is off until the draft is read, and says why, as the band's twin button does
// (BandSide.test.tsx): a disabled button is not focusable, so its title is the only place the reason can live.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { InspCra } from './InspCra';

const demo = pickNeedsYouDemo();
const base = initialState(demo);
const html = (draft: boolean) => renderToStaticMarkup(<InspCra s={{ ...base, read: { ...base.read, draft } }} demo={demo} leftSec={0} dispatch={() => {}} />);

describe('InspCra', () => {
  it('open: Ready to sign is disabled with the reason until the draft is read', () => {
    expect(html(false)).toMatch(/<button[^>]*disabled=""[^>]*title="Read the draft first[^"]*"[^>]*>Ready to sign/);
    const read = html(true);
    expect(read).toContain('Ready to sign');
    expect(read).not.toContain('Read the draft first');
  });
});
