// aria-label only names an element that has a role: on a bare <span> it is dropped by assistive tech, so the
// "3 waiting for you" / "feed failing" text was announced as just "3" or the age. Every status component that
// names itself with aria-label must also say role="img" (the pattern TierMark and StateGlyph already follow).
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedAge } from '../FeedAge';
import { NeedsYouBadge } from '../NeedsYouBadge';
import { StateGlyph } from '../StateGlyph';
import { TierChip } from '../TierChip';
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
  ['TierMark split', renderToStaticMarkup(createElement(TierMark, { tier: 'refused', holders: [{ agent: 'a', tier: 'assisted' }, { agent: 'b', tier: 'supervised' }] }))],
  ['TierChip own words', renderToStaticMarkup(createElement(TierChip, { tier: 'human_only' }, 'submit'))],
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

// TierChip draws its letter beside the tier's name: read aloud it is "S Supervised". The letter is decoration there.
describe('a letter mark beside its own name is hidden from assistive tech', () => {
  it('TierChip', () => {
    const html = renderToStaticMarkup(createElement(TierChip, { tier: 'supervised' }));
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>S<\/span>Supervised/);
  });
});

describe('TierChip with its own words', () => {
  it('names the tier through the letter, since the words do not', () => {
    const html = renderToStaticMarkup(createElement(TierChip, { tier: 'human_only' }, 'submit'));
    expect(html).toMatch(/<span[^>]*role="img"[^>]*aria-label="Human only"[^>]*>[^<]+<\/span>submit/);
  });
});

// CASES is a hand list: derive what it must cover from the folder, so a new self-naming component cannot skip the rule.
describe('the role rule covers every status component that uses aria-label', () => {
  const dir = join(__dirname, '..');
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.tsx') && !f.includes('__tests__'));
  const naming = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes('aria-label')).map((f) => basename(f, '.tsx'));
  it.each(naming)('%s has a case', (component) => {
    expect(CASES.some(([n]) => n.split(' ')[0] === component)).toBe(true);
  });
  it('control: the folder scan finds the known ones', () => {
    expect(naming).toEqual(expect.arrayContaining(['FeedAge', 'NeedsYouBadge', 'StateGlyph', 'TierMark']));
  });
});
