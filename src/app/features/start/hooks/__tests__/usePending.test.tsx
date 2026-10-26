// Run it -> the server's preview -> Confirm: the sheet's Confirm button (ActionButtons' own onClick) calls confirmAction
// with the intent and exactly the preview's id, and a done answer re-checks. Server actions are mocked.
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { installFakeDom } from '@/components/shell/frame/fakeDom';
import type { ActionPreview } from '@/server/actions/types';
import type { PendingView } from '../../model/view';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
vi.mock('next/link', () => ({ default: () => null }));

const { container } = installFakeDom();
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { usePending } = await import('../usePending');
const { ActionButtons } = await import('../../components/sheet/ActionSheet');

const preview = { kind: 'set-setup', title: 'Set the group', summary: 's', risk: 'low', commands: [], diff: [], previewId: 'pv-1', mode: 'live' } as unknown as ActionPreview;
const intent = { kind: 'set-setup', groupId: '777', mode: 'live' } as const;
const tick = () => new Promise((r) => setTimeout(r, 0));

/** The element in a tree whose children read `label` (the Confirm button). */
function find(node: ReactNode, label: string): ReactElement<{ onClick?: () => void; children?: ReactNode }> | null {
  if (Array.isArray(node)) return node.map((n) => find(n, label)).find(Boolean) ?? null;
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return null;
  if (node.props.children === label) return node;
  return find(node.props.children, label);
}

describe('usePending', () => {
  it('previews at once, and Confirm sends the intent with the preview id; done re-checks', async () => {
    actions.previewAction.mockResolvedValue({ status: 'preview', preview });
    actions.confirmAction.mockResolvedValue({ status: 'done', preview, results: [] });
    const onDone = vi.fn();
    const got: { p: ReturnType<typeof usePending> | null } = { p: null };
    const Probe = () => ((got.p = usePending(() => {}, onDone)), null);
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Probe)));
    await act(async () => (got.p!.run(intent, 'group'), await tick()));
    expect(actions.previewAction).toHaveBeenCalledWith(intent);
    const pending = got.p!.pending as PendingView;
    expect(pending.preview).toEqual({ kind: 'preview', preview });

    const confirm = find(ActionButtons({ pending }), 'Confirm');
    expect(confirm).not.toBeNull();
    await act(async () => (confirm!.props.onClick!(), await tick()));
    expect(actions.confirmAction).toHaveBeenCalledWith(intent, 'pv-1');
    expect(got.p!.pending?.done).toBe(true);
    expect(onDone).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });

  it('save-project needs no preview: Confirm hands to the wizard’s own save', async () => {
    const onSave = vi.fn();
    const got: { p: ReturnType<typeof usePending> | null } = { p: null };
    const Probe = () => ((got.p = usePending(onSave, () => {})), null);
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Probe)));
    await act(async () => got.p!.run({ kind: 'save-project' }, 'save'));
    expect(got.p!.pending?.summary).toMatch(/only the lines a probe confirmed/);
    await act(async () => got.p!.pending!.confirm());
    expect(onSave).toHaveBeenCalledOnce();
    expect(got.p!.pending).toBeNull();
    await act(async () => root.unmount());
  });
});
