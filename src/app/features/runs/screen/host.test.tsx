import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SliceFixture } from '@/components/shell/host';
import { WAVE_1 } from '@/lib/runs/fixture';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunEvent } from '@/schemas/run/run';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/runs', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

const def = screens.find((d) => d.key === 'runs');
const render = (slices: Record<string, unknown>, states = {}) => {
  const Frame = def?.Frame ?? (() => null);
  return renderToString(
    <SliceFixture slices={slices} states={states}>
      <Frame params={{}} search={new URLSearchParams()} />
    </SliceFixture>,
  ).replace(/<!-- -->/g, '');
};
const wave = foldWave(
  WAVE_1.map(parseRunLine).filter((e): e is RunEvent => e !== null),
  true,
);
const data = foldRuns(wave ? [wave] : [], 0);

describe('Runs on the screen host', () => {
  it('is claimed, with its slices in stream order', () => {
    expect(def).toMatchObject({ ready: true, slices: ['runs', 'merges'] });
    expect(def?.title({}, new URLSearchParams())).toBe('Belay Runs');
  });

  it('unread: the window and the totals strip with a dash in every figure, never a 0, no empty note', () => {
    const html = render({});
    expect(html).toContain('<b>Runs</b>');
    expect(html).toContain('waves not read yet');
    expect(html).toContain('spent not read yet');
    expect(html).not.toMatch(/>0</);
    expect(html).not.toContain('No runs yet');
  });

  it('runs read: the totals and the waves fill in; an empty folder says how to start one', () => {
    const html = render({ runs: data });
    expect(html).toContain('alpha');
    expect(html).toContain('data-reveal="in"');
    expect(render({ runs: foldRuns([], 0) })).toContain('No runs yet');
  });

  it('the runs could not be read: says why in the pane', () => {
    expect(render({}, { runs: { state: 'error', reason: 'unreadable' } })).toContain('The runs could not be read: unreadable.');
  });
});
