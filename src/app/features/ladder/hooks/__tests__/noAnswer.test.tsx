// A confirm that threw (p or r): the toast keeps NO_ANSWER; the status line says why it threw, Next's digest included,
// so the operator can find the write in the server log. The server action is mocked to reject.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContext, type ToastApi } from '@/components/overlays/toast/useToast';
import { HUMAN_KEY } from '@/lib/promotion';
import type { ActionPreview } from '@/server/actions/types';
import { NO_ANSWER, type WriteView } from '@/server/actions/words';
import type { ClassRow } from '../../model/types';
import type { LadderData } from '../useLadderData';
import type { PromoteWrites } from '../usePromoteWrite';
import type { RevokeWrites } from '../useRevokeWrite';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
const { usePromoteAction } = await import('../usePromoteAction');
const { useRevokeActions } = await import('../revoke/useRevokeActions');

const preview = { kind: 'promote-class', title: 't', summary: 's', risk: 'policy', diff: [], previewId: 'pv-1', mode: 'live', commands: [] } as ActionPreview;
const view: WriteView = { kind: 'preview', preview };
const row: ClassRow = { id: 'a', track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: '', pending: null };
const thrown = Object.assign(new Error('An error occurred in the Server Components render.'), { digest: '1234567' });

/** Mounts `use` under a toast provider that records every call, and hands back what the hook returned. */
function mount<T>(use: () => T): { got: T; toasts: string[]; statuses: string[] } {
  const toasts: string[] = [];
  const statuses: string[] = [];
  const api: ToastApi = { toast: (m) => void toasts.push(m), status: (m) => void statuses.push(m), statusMessage: '' };
  let got: T | undefined;
  const Probe = () => {
    got = use();
    return null;
  };
  renderToStaticMarkup(createElement(ToastContext.Provider, { value: api }, createElement(Probe)));
  return { got: got as T, toasts, statuses };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  actions.confirmAction.mockReset();
  actions.confirmAction.mockRejectedValue(thrown);
});

describe('a thrown confirm keeps its reason', () => {
  it('p: toasts NO_ANSWER and the status line names the write, NO_ANSWER and the digest', async () => {
    const data = { byId: { a: row }, selected: row, promotionOf: () => ({ kind: 'eligible', next: 'hands_off', rules: [], precondition: HUMAN_KEY }), dispatch: () => {} } as unknown as LadderData;
    const promos = { viewOf: () => view, put: () => {} } as unknown as PromoteWrites;
    const m = mount(() => usePromoteAction('ledgerline', data, promos, { shown: () => true, show: () => {} }));
    m.got('a');
    await settle();
    expect(actions.confirmAction).toHaveBeenCalledOnce();
    expect(m.toasts).toEqual([NO_ANSWER]);
    expect(m.statuses.at(-1)).toBe(`a → Hands-off: ${NO_ANSWER} (An error occurred in the Server Components render. (digest 1234567))`);
  });

  it('r: toasts NO_ANSWER and the status line names the write, NO_ANSWER and the digest', async () => {
    const writes = { viewOf: () => view, put: () => {}, clear: () => {} } as unknown as RevokeWrites;
    const m = mount(() =>
      useRevokeActions({
        project: 'ledgerline', latest: { current: {} as LadderData }, dispatch: () => {}, writes, promos: {} as PromoteWrites,
        revokeShown: () => true, onShow: () => {}, stamp: () => 0, later: () => {}, focusTable: () => {}, simCountRef: { current: 0 },
      }),
    );
    m.got.revoke('a', 'assisted');
    await settle();
    expect(actions.confirmAction).toHaveBeenCalledOnce();
    expect(m.toasts).toEqual([NO_ANSWER]);
    expect(m.statuses.at(-1)).toBe(`a → Assisted: ${NO_ANSWER} (An error occurred in the Server Components render. (digest 1234567))`);
  });
});
