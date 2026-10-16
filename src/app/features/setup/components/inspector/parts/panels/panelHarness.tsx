// Renders one inspector panel against a hand-made Setup API: a state a test edits, the writes a test names, and actions
// that record the call instead of running it. No provider, no timers, no network.
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getSetup, getTracks } from '@/lib/demo';
import type { WriteView } from '@/server/actions/words';
import { SetupContext, type SetupApi } from '../../../../hooks/SetupContext';
import { createSetupState } from '../../../../model/flow/state';
import type { ArmState, SetupState, StepState } from '../../../../model/types';

export const base = (): SetupState => createSetupState(getSetup(), 0);
export const withArm = (s: SetupState, id: string, a: Partial<ArmState>): SetupState => ({ ...s, arm: { ...s.arm, [id]: { ...s.arm[id]!, ...a } } });
export const withStep = (s: SetupState, n: number, x: Partial<StepState>): SetupState => ({ ...s, steps: { ...s.steps, [n]: { ...s.steps[n]!, ...x } } });

/** A planned MR the Arm and Disarm buttons can be enabled by. */
export const PREVIEW = { kind: 'preview', preview: { summary: 'one MR', branch: 'belay/arm', mode: 'demo', commands: [{ display: 'git push belay/arm' }], diff: [], notes: [] } } as unknown as WriteView;

export interface Spies {
  actions: Record<string, ReturnType<typeof vi.fn>>;
  home: ReturnType<typeof vi.fn>;
}

/** The panel's markup, with every action a spy (read through `spies.actions.name`). */
export function renderPanel(ui: ReactNode, state: SetupState, opts: { view?: WriteView; sent?: { mr: string | null; url: string | null; simulated: boolean } } = {}): { html: string; spies: Spies } {
  const actions: Spies['actions'] = {};
  const home = vi.fn();
  const api = {
    state,
    tracks: Object.fromEntries(getTracks().map((t) => [t.id, t])),
    classes: [],
    illustrative: { steps: false, tracks: false },
    view: { home, go: vi.fn(), pick: vi.fn() },
    actions: new Proxy({}, { get: (_, k: string) => (actions[k] ??= vi.fn()) }),
    writes: { viewOf: () => opts.view, want: () => {}, put: () => {}, clear: () => {}, round: 0 },
    enroll: { viewOf: () => opts.view, sentOf: () => opts.sent, want: () => {}, send: async () => '' },
    startTier: null,
  } as unknown as SetupApi;
  const html = renderToStaticMarkup(
    <ToastProvider>
      <SetupContext.Provider value={api}>{ui}</SetupContext.Provider>
    </ToastProvider>,
  );
  return { html, spies: { actions, home } };
}

/** The opening tag of the button whose label contains `label`, or null when there is none. */
export const buttonTag = (html: string, label: string): string | null =>
  [...html.matchAll(/<button\b([^>]*)>((?:(?!<\/button>)[\s\S])*)<\/button>/g)].find((m) => m[2]!.replace(/<!-- -->/g, '').includes(label))?.[1] ?? null;
export const isDisabled = (tag: string | null): boolean => !!tag && /\bdisabled=""/.test(tag);
