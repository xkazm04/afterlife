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

describe('Menu first highlight', () => {
  // useMenu's highlightFirst passes index 0, which a caller's menu often spends on a head ("Take it to ·", "Proof class").
  const lit = (list: Parameters<typeof Menu>[0]['items'], initialActive: number): string | null => {
    const html = renderToStaticMarkup(<Menu items={list} x={0} y={0} onRun={() => {}} onClose={() => {}} initialActive={initialActive} />);
    const id = /aria-activedescendant="([^"]+)"/.exec(html)?.[1];
    if (!id) return null;
    return new RegExp(`id="${id}"[^>]*>(?:<span[^>]*>[^<]*</span>)?<span>([^<]*)</span>`).exec(html)?.[1] ?? 'MISSING';
  };
  it('skips a head, a separator and a disabled entry to the first item that can run', () => {
    expect(lit([{ head: 'Take it to' }, { sep: true }, { label: 'Off', disabled: true, run: () => {} }, { label: 'Supervised', run: () => {} }], 0)).toBe('Supervised');
  });
  it('keeps an enabled initial item as given', () => {
    expect(lit([{ label: 'A', run: () => {} }, { label: 'B', run: () => {} }], 1)).toBe('B');
  });
  it('highlights nothing when nothing was asked for, or when no entry can run', () => {
    expect(lit([{ head: 'H' }, { label: 'A', run: () => {} }], -1)).toBeNull();
    expect(lit([{ head: 'H' }, { label: 'A', disabled: true, run: () => {} }], 0)).toBeNull();
  });
});
