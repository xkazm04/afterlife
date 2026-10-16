import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

// Plain-node vitest has no document: a stub body satisfies the portal call, and the portal is flattened so the menu
// surface itself can be rendered to markup.
vi.stubGlobal('document', { body: {} });
vi.mock('react-dom', async (orig) => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (node: unknown) => node }));

const items = [{ label: 'Name', run: () => {} }];
const render = (label?: string): string => renderToStaticMarkup(<Menu items={items} x={0} y={0} onRun={() => {}} onClose={() => {}} label={label} />);

describe('Menu accessible name', () => {
  it('names the role=menu surface from `label`', () => {
    expect(render('Sort')).toMatch(/role="menu"[^>]*aria-label="Sort"/);
  });
  it('leaves it unnamed when no label is given, as before', () => {
    expect(render()).not.toContain('aria-label');
  });
});
