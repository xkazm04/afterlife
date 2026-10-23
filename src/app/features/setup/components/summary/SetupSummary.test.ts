import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import type { StepRead } from '@/server/data/setup/types';
import { STEP_DETAIL } from '../../data/stepDetail';
import { SetupProvider } from '../../hooks/SetupProvider';
import { SetupStatus } from '../SetupStatus';
import { SetupSummary } from './SetupSummary';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup', useRouter: () => ({ push: () => {} }) }));

// The strip and the status bar over a live read: `open` names the human steps a read has not seen done; every other step
// reads done. `unknown` is how many doctor rows read unknown (the rest available).
const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
const HUMAN = Object.entries(STEP_DETAIL).filter(([, d]) => d.who === 'human').map(([n]) => Number(n));
function render(open: number[], unknown: number, node: () => ReactNode): string {
  const steps: Record<number, StepRead> = {};
  for (let n = 0; n <= 14; n++) steps[n] = open.includes(n) ? { state: 'unknown', reason: 'not probed' } : { state: 'done', text: 'read done' };
  const rows = Array.from({ length: unknown + 1 }, (_, i) => ({ id: `c${i}`, label: `cap ${i}`, status: i < unknown ? ('unknown' as const) : ('available' as const), reason: 'r' }));
  const live = {
    group: 'g', host: 'gitlab.com', project: 'p', projects: ['p'],
    tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, { state: 'undefined' as const, text: 'not defined' }])),
    tracksAt: at, doctor: { ...at, error: null, rows }, steps: { ...at, steps },
  };
  const props = { setup: getSetup(), tracks: getTracks(), classes: getActionClasses(), live, illustrative: { steps: true, tracks: true } };
  return renderToString(createElement(ToastProvider, null, createElement(SetupProvider, props, node())));
}
const strip = (open: number[], unknown = 0) => render(open, unknown, () => createElement(SetupSummary));
const status = (open: number[]) => render(open, 0, () => createElement(SetupStatus));

describe('the summary strip and the status bar count in words', () => {
  it('the fixture has human steps to leave open', () => expect(HUMAN.length).toBeGreaterThanOrEqual(2));
  it('one unknown capability is one capability, two are capabilities', () => {
    expect(strip([], 1)).toContain('1 capability unknown, never rounded up');
    expect(strip([], 2)).toContain('2 capabilities unknown, never rounded up');
  });
  it('one step waiting on you needs you; two need you', () => {
    expect(status(HUMAN.slice(0, 1))).toContain('1 needs you');
    expect(status(HUMAN.slice(0, 2))).toContain('2 need you');
  });
});

// README: "Nothing waits for you" only when every human step reads done and no arm MR is open (humanGates).
describe('the gates the strip lists', () => {
  it('says nothing waits for you when every human step reads done and no MR is open', () => {
    expect(strip([])).toContain('Nothing waits for you');
  });
  it('lists an open human step instead, and never says nothing waits', () => {
    const html = strip(HUMAN.slice(0, 1));
    expect(html).toContain('unread · frees');
    expect(html).not.toContain('Nothing waits for you');
  });
});
