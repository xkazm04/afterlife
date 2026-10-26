import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import FleetNotFound from '@/app/(app)/fleet/[project]/not-found';
import LadderNotFound from '@/app/(app)/ladder/[class]/not-found';
import MaturityNotFound from '@/app/(app)/maturity/[stage]/not-found';
import NeedsNotFound from '@/app/(app)/needs-you/[item]/not-found';
import SetupNotFound from '@/app/(app)/setup/[node]/not-found';
import TaskNotFound from '@/app/(app)/task/[id]/not-found';

vi.mock('next/link', () => ({ default: (p: { href: string; className?: string; children?: unknown }) => createElement('a', { href: p.href, className: p.className }, p.children as never) }));

// Each dynamic route's not-found says WHICH thing is missing and links to that screen's front, not to the fleet.
const CASES = [
  ['fleet', FleetNotFound, 'Project not found', '/fleet', 'Back to Fleet'],
  ['ladder', LadderNotFound, 'Class not found', '/ladder', 'Back to the Ladder'],
  ['maturity', MaturityNotFound, 'Stage not found', '/maturity', 'Back to Maturity'],
  ['needs-you', NeedsNotFound, 'Decision not found', '/needs-you', 'Back to Needs you'],
  ['setup', SetupNotFound, 'Setup node not found', '/setup', 'Open the unlock map'],
  ['task', TaskNotFound, 'Task not found', '/task', 'Open the docket'],
] as const;

describe('dynamic-route not-found pages', () => {
  it.each(CASES)('%s names the missing thing and links back to its screen', (_name, Page, title, href, label) => {
    const html = renderToString(createElement(Page));
    expect(html).toContain(`>${title}</h1>`);
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain(`>${label}</a>`);
    expect(html).toContain('<div class="fallback-scroll"><main');
    expect(html).toContain(`<title>Afterlife · ${title}</title>`);
  });
});
