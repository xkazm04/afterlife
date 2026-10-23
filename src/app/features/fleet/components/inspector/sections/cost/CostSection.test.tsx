// The Agent cost card: spent and waves for a metered project, "not metered" (and the repos not in Fleet) otherwise, a
// dash for a cost no repo reported, never $0.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CostJoin } from '@/lib/runs/desk/join';
import { CostSection } from './CostSection';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const join: CostJoin = { byProject: { ledgerline: { costUsd: 3.2, waves: 4, repos: ['ledger-local'] }, kyc: { costUsd: null, waves: 0, repos: ['kyc'] } }, unmatched: ['paypal'] };
const card = (id: string, cost: CostJoin | null) => renderToStaticMarkup(createElement(CostSection, { id, cost }));

describe('CostSection', () => {
  it('a metered project: what its agents spent, its waves and the runner repos, with a way to /runs', () => {
    const out = card('ledgerline', join);
    expect(out).toContain('$3.20');
    expect(out).toContain('4</b><span>waves');
    expect(out).toContain('By 1 runner repo: ledger-local');
    expect(out).toContain('href="/runs"');
  });
  it('a project no runner repo works says not metered, and lists the repos not in Fleet', () => {
    const out = card('fx-rates', join);
    expect(out).toContain('Not metered');
    expect(out).toContain('Not in Fleet: paypal');
    expect(out).not.toContain('$0');
  });
  it('a matched repo that reported no cost is a dash, never $0', () => {
    const out = card('kyc', join);
    expect(out).toContain('<b>-</b><span>spent: not reported');
    expect(out).not.toContain('$0');
  });
  it('not read says so', () => {
    expect(card('kyc', null)).toContain('Not read');
  });
});
