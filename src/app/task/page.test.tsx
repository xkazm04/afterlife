import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const first = vi.hoisted(() => ({ id: null as string | null }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return { default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) };
});
vi.mock('../features/task/model/build/loadTasks', () => ({ firstTaskId: () => first.id }));

describe('/task index', () => {
  beforeEach(() => redirect.mockClear());

  it('redirects to the first task when the docket holds one', async () => {
    first.id = 'a b';
    const { default: Page } = await import('./page');
    Page();
    expect(redirect).toHaveBeenCalledWith('/task/a%20b');
  });

  it('draws an in-window empty docket, not a redirect to the front door, when it holds none', async () => {
    first.id = null;
    const { default: Page } = await import('./page');
    const html = renderToString(Page());
    expect(redirect).not.toHaveBeenCalled();
    expect(html).toContain('No task is held in the docket');
  });
});
