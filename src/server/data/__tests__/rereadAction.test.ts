// Setup's Re-probe and step re-read: read only, live only, and only for a request addressed to this machine.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoSource } from '../demoSource';
import { setDataSource } from '../select';
import type { SetupReads } from '../setup/read';
import type { DataSource } from '../types';

const at: { headers: Headers } = { headers: new Headers({ host: 'localhost:3000' }) };
vi.mock('next/headers', () => ({ headers: async () => at.headers }));
const { rereadSetupAction } = await import('../setup/rereadAction');

const STAMP = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
const reads: SetupReads = {
  group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife'],
  tracks: () => Promise.reject(new Error('Re-probe never reads the tracks')),
  doctor: vi.fn(() => Promise.resolve({ ...STAMP, rows: [], error: null })),
  steps: vi.fn(() => Promise.resolve({ ...STAMP, steps: {} })),
};
const live: DataSource = { ...demoSource, mode: 'live', setupReads: () => reads };

afterEach(() => {
  setDataSource(null);
  at.headers = new Headers({ host: 'localhost:3000' });
});

describe('rereadSetupAction', () => {
  it('live, from this machine: the doctor or the steps, read again', async () => {
    setDataSource(live);
    expect(await rereadSetupAction('doctor')).toEqual({ status: 'doctor', doctor: { ...STAMP, rows: [], error: null } });
    expect(await rereadSetupAction('steps')).toEqual({ status: 'steps', steps: { ...STAMP, steps: {} } });
  });

  it('refuses a request that does not name localhost, before reading anything', async () => {
    setDataSource(live);
    vi.mocked(reads.doctor).mockClear();
    at.headers = new Headers({ host: 'evil.test' });
    expect(await rereadSetupAction('doctor')).toEqual({ status: 'refused', reason: expect.stringMatching(/"evil\.test", not localhost/) });
    expect(reads.doctor).not.toHaveBeenCalled();
  });

  it('demo mode reads nothing; a part it does not know, or a source with no snapshot yet, is refused', async () => {
    setDataSource(demoSource);
    expect(await rereadSetupAction('doctor')).toEqual({ status: 'refused', reason: 'demo mode: Belay reads nothing from GitLab' });
    setDataSource(live);
    expect(await rereadSetupAction('tracks')).toMatchObject({ status: 'refused' });
    setDataSource({ ...live, setupReads: () => { throw new Error('BELAY_MODE=live, but the first poll has not finished'); } });
    expect(await rereadSetupAction('steps')).toEqual({ status: 'refused', reason: expect.stringMatching(/first poll/) });
  });

  it('a live start that failed is named as the pages name it (select.ts), not as a first poll still running', async () => {
    const failed = 'BELAY_MODE=live, but the live start failed: glab is not logged in. It is retried every 30s.';
    setDataSource({ ...live, setupReads: () => { throw new Error(failed); } });
    expect(await rereadSetupAction('doctor')).toEqual({ status: 'refused', reason: failed });
  });

  it('a read that throws is answered as a refusal that names what failed, and is logged on the server', async () => {
    setDataSource(live);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(reads.steps).mockRejectedValueOnce(new Error('glab: exit 1'));
    expect(await rereadSetupAction('steps')).toEqual({ status: 'refused', reason: 'the steps could not be read: glab: exit 1' });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
