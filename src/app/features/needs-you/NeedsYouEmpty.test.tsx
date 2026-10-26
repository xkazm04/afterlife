// The empty state tells the truth in both modes: live waits on a poller, a demo source without the desk items does not.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NeedsYouEmpty } from './NeedsYouEmpty';

describe('NeedsYouEmpty', () => {
  it('live: says Afterlife is reading the group and the poller fills the inbox', () => {
    const out = renderToStaticMarkup(<NeedsYouEmpty seeded={0} />);
    expect(out).toContain('Afterlife is reading your GitLab group');
  });
  it('demo: says the fixture lacks the desk items and names no group or poller to wait for', () => {
    const out = renderToStaticMarkup(<NeedsYouEmpty demo />);
    expect(out).toContain('lacks the desk');
    expect(out).not.toContain('reading your GitLab group');
    expect(out).not.toContain('fills as the poller');
  });
});
