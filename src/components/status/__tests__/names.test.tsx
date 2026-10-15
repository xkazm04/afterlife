// aria-label only names an element that has a role: on a bare <span> it is dropped by assistive tech, so the
// "3 waiting for you" / "feed failing" text was announced as just "3" or the age. Every status component that
// names itself with aria-label must also say role="img" (the pattern TierMark and StateGlyph already follow).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedAge } from '../FeedAge';
import { NeedsYouBadge } from '../NeedsYouBadge';
import { StateGlyph } from '../StateGlyph';
import { TierMark } from '../TierMark';

/** Every opening tag that carries an aria-label. */
const labelled = (html: string): string[] => html.match(/<[a-z]+[^>]*\saria-label="[^"]*"[^>]*>/g) ?? [];

const CASES: Array<[string, string]> = [
  ['NeedsYouBadge live count', renderToStaticMarkup(createElement(NeedsYouBadge, { count: 3 }))],
  ['NeedsYouBadge last-known', renderToStaticMarkup(createElement(NeedsYouBadge, { count: 3, variant: 'last-known' }))],
  ['NeedsYouBadge titled label', renderToStaticMarkup(createElement(NeedsYouBadge, { label: 'G-12', title: 'Gap G-12' }))],
  ['FeedAge never polled', renderToStaticMarkup(createElement(FeedAge, { ageSec: null, ok: null }))],
  ['FeedAge failing', renderToStaticMarkup(createElement(FeedAge, { ageSec: 5400, ok: false, error: 'token expired' }))],
  ['StateGlyph stale', renderToStaticMarkup(createElement(StateGlyph, { state: 'stale' }))],
  ['TierMark hands_off', renderToStaticMarkup(createElement(TierMark, { tier: 'hands_off' }))],
];

describe('status components: a named element has a role', () => {
  it.each(CASES)('%s', (_name, html) => {
    const tags = labelled(html);
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t).toMatch(/\srole="img"/);
  });

  it('keeps the spoken text, not just the digit', () => {
    expect(renderToStaticMarkup(createElement(NeedsYouBadge, { count: 3 }))).toContain('aria-label="3 waiting for you"');
    expect(renderToStaticMarkup(createElement(FeedAge, { ageSec: 5400, ok: false, error: 'token expired' }))).toContain('feed failing: token expired');
  });
});
