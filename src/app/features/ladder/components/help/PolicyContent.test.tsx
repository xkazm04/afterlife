// The policy popover is stored as an element when it opens. Its tier-state.yml head must be the screen's current one:
// before, a revoke landing with it open left the lozenge on the new sha and the popover on the old.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Head } from '../../model/types';
import { PolicyContent, PolicyHeadProvider } from './PolicyContent';

const head = (sha: string): Head => ({ sha, by: 'someone' }) as Head;
const shas = (html: string) => html.match(/<code[^>]*>([^<]*)<\/code>/g) ?? [];

describe('the policy popover head', () => {
  it('an element captured at press time shows the head of the render it is later drawn in', () => {
    const captured = <PolicyContent rules={null} history={false} />;
    const before = renderToStaticMarkup(<PolicyHeadProvider head={head('aaa1111')}>{captured}</PolicyHeadProvider>);
    const after = renderToStaticMarkup(<PolicyHeadProvider head={head('bbb2222')}>{captured}</PolicyHeadProvider>);
    expect(shas(before)).toHaveLength(1);
    expect(before).toContain('aaa1111');
    expect(after).toContain('bbb2222');
    expect(after).not.toContain('aaa1111');
  });
});
