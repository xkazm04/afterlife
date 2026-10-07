import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from '@/app/global-error';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';

vi.mock('next/navigation', () => ({ usePathname: () => '/nope/here' }));
vi.mock('next/link', () => ({ default: (p: { href: string; className?: string; children?: unknown }) => createElement('a', { href: p.href, className: p.className }, p.children as never) }));

const err = Object.assign(new Error('BELAY_MODE=live, but the first poll has not finished'), { digest: 'd1g3st' });
const retry = () => {};

describe('error boundaries', () => {
  it('error.tsx shows the message, the digest, the belay: hint and Retry', () => {
    const html = renderToString(createElement(ErrorPage, { error: err, retry }));
    expect(html).toContain('could not be read');
    expect(html).toContain('first poll has not finished');
    expect(html).toContain('d1g3st');
    expect(html).toContain('belay:');
    expect(html).toContain('>Retry</button>');
    expect(html).not.toContain('illustrative demo data');
  });
  it('global-error.tsx is the same inside its own html and body', () => {
    const html = renderToString(createElement(GlobalError, { error: err, retry }));
    expect(html).toMatch(/^<html/);
    expect(html).toContain('<body');
    expect(html).toContain('first poll has not finished');
    expect(html).toContain('d1g3st');
    expect(html).toContain('>Retry</button>');
  });
  it('not-found.tsx names the path and links to /fleet', () => {
    const html = renderToString(createElement(NotFound));
    expect(html).toContain('/nope/here');
    expect(html).toContain('href="/fleet"');
  });
});
