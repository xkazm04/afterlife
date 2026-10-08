// A live confirm that ran its commands polls (run.ts), and then the route renders again from the fresh snapshot in the
// same round trip, as repollAction does: otherwise the acted item stays listed until the operator navigates away.
// Demo mode ran nothing, and neither did a confirm that came back refused or changed: none of them re-renders.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';
import { liveRig, policyFiles, type ActionRig } from '../rig';

const at = vi.hoisted(() => ({ deps: null as ActionDeps | null, refresh: null as unknown as ReturnType<typeof vi.fn<() => void>> }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' }) }));
vi.mock('next/cache', () => ({ refresh: () => at.refresh() }));
vi.mock('../../deps', () => ({ actionDeps: () => at.deps }));

const { confirmAction, previewAction } = await import('../../actions');

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const idOf = (r: ActionResponse) => (r.status === 'preview' ? r.preview.previewId : 'f'.repeat(64));

let rig: ActionRig;
beforeEach(async () => {
  at.refresh = vi.fn<() => void>();
  rig = await liveRig();
  at.deps = rig.deps;
});

describe('confirmAction re-renders the route only after a live confirm ran its commands', () => {
  it('a live confirm that ran its commands polls, then calls refresh once', async () => {
    const r = await confirmAction(revoke, idOf(await previewAction(revoke)));
    expect(r.status).toBe('done');
    expect(rig.refresh).toHaveBeenCalledTimes(1);
    expect(at.refresh).toHaveBeenCalledTimes(1);
  });

  it('demo mode never calls it: nothing ran', async () => {
    at.deps = { ...rig.deps, mode: 'demo', db: null };
    const r = await confirmAction(revoke, idOf(await previewAction(revoke)));
    expect(r).toMatchObject({ status: 'done', results: [{ simulated: true }] });
    expect(at.refresh).not.toHaveBeenCalled();
  });

  it('a live confirm that came back changed or refused never calls it: nothing ran', async () => {
    const id = idOf(await previewAction(revoke));
    policyFiles(rig.gl)['tier-state.yml'] += '# someone committed meanwhile\n';
    expect((await confirmAction(revoke, id)).status).toBe('changed');
    expect((await confirmAction({ ...revoke, changes: [{ class: 'nope.class', to: 'assisted' }] }, id)).status).toBe('refused');
    expect(at.refresh).not.toHaveBeenCalled();
  });
});
