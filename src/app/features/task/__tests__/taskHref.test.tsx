// A task id is a path segment: the docket links must encode it the way /task and the fleet's task list already do.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Docket } from '../components/docket/Docket';
import { taskHref } from '../components/docket/taskHref';
import { loadTasks } from '../model/build/loadTasks';
import { docketRow } from '../model/docket/row';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const odd = { ...docketRow(loadTasks()[0]!), id: 'a/b?c#d e' };

describe('taskHref', () => {
  it('encodes the id as one path segment', () => {
    expect(taskHref('01J8Q4')).toBe('/task/01J8Q4');
    expect(taskHref('a/b?c#d e')).toBe('/task/a%2Fb%3Fc%23d%20e');
  });

  it('is what the docket links to', () => {
    const html = renderToStaticMarkup(createElement(Docket, { tasks: [odd], visible: [odd], currentId: odd.id, onClear: () => undefined }));
    expect(html).toContain(`href="${taskHref(odd.id)}"`);
    expect(html).not.toContain('href="/task/a/b');
  });
});
