// Every staged write has a disclosure, Run and Remove. With several staged, three buttons called "Run" are
// indistinguishable to a screen reader, so each name carries the write's title; the visible words stay first.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OutItem } from '../../model/types';
import { OutboxItem } from './OutboxItem';

const item = (key: string, title: string): OutItem => ({ key, kind: 'MR', title, ref: `r-${key}`, commands: ['glab mr create'] });
const html = (i: OutItem, open: boolean) => renderToStaticMarkup(<OutboxItem item={i} open={open} selected={false} dispatch={() => {}} />);
const labels = (out: string) => [...out.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]);

describe('OutboxItem', () => {
  it('names Run, Remove and the disclosure by the write they act on', () => {
    const a = labels(html(item('a', 'Promote qa.file-bug'), true));
    const b = labels(html(item('b', 'Re-admit patch-bump'), true));
    expect(a).toEqual(expect.arrayContaining(['Run Promote qa.file-bug', 'Remove Promote qa.file-bug', 'Collapse the commands of Promote qa.file-bug']));
    expect(a.filter((l) => b.includes(l))).toEqual([]);
    expect(labels(html(item('a', 'Promote qa.file-bug'), false))).toContain('Show the commands of Promote qa.file-bug');
  });
});
