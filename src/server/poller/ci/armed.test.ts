// The armed-tracks read: markers counted once per track, an edited block not counted, an unread file null (never 0),
// and an unchanged file never fetched twice.
import { describe, expect, it } from 'vitest';
import { armBlock } from '@/server/actions/arm/block';
import { armOf, type ArmPin } from '@/server/actions/arm/content';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlFile, GlProject } from '@/server/gitlab/types';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { rig } from '../__tests__/helpers';
import { createMemory } from '../state';
import { CI_FILE, countArmed, readArmed } from './armed';

const PIN: ArmPin = { packVersion: '1.0.0', engineRef: 'v0.1.0', proofAuthors: 'belay-apply' };
const block = (track: string): string[] => armBlock(armOf(track)!, 'acme-lab', PIN, '  ', false);
const ci = (...blocks: string[][]): string => ['stages: [build]', '', 'include:', ...blocks.flat(), '  - template: Jobs/SAST.gitlab-ci.yml', ''].join('\n');
/** A marker pair for a track the repo defines no arm content for: counted on its markers alone. */
const generic = (track: string, key: string): string[] => [`  # belay:arm ${track} ${key} begin 0123456789ab`, '  - local: x.yml', `  # belay:arm ${track} ${key} end`];

describe('countArmed: distinct tracks, from the markers', () => {
  it('the demo CI file arms T4 only', () => {
    expect(countArmed(LEDGERLINE_CI)).toBe(1);
  });

  it('no markers, no tracks: 0 (the file was read)', () => {
    expect(countArmed(ci())).toBe(0);
  });

  it('every block the repo defines, and the generic markers of the other tracks, each once', () => {
    const all = ci(block('T1'), block('T3'), block('T4'), block('T6'), generic('T2', 'medic'), generic('T5', 'x'), generic('T7', 'y'), generic('T8', 'z'));
    expect(countArmed(all)).toBe(8);
    expect(countArmed(ci(block('T4'), block('T4')))).toBe(1); // a track twice is one track
  });

  it('a block edited since its arm is not counted, nor a begin marker without its end', () => {
    const edited = block('T4').map((l) => l.replace('cited-diff', 'cited-diff-x'));
    expect(countArmed(ci(edited, block('T1')))).toBe(1);
    expect(countArmed(ci(generic('T2', 'medic').slice(0, 2)))).toBe(0);
    expect(countArmed(ci(generic('T9', 'nine')))).toBe(0); // not a track
  });
});

const GL: GlProject = {
  id: 7, name: 'p', path: 'p', pathWithNamespace: 'g/p', defaultBranch: 'main', webUrl: 'https://gitlab.example/g/p', visibility: 'private', archived: false, description: null,
};
const file = (content: string): GlFile => ({ path: CI_FILE, ref: 'main', blobId: 'b', size: content.length, content, lastCommitId: 'c1' });

/** A port reading one CI file at a given newest commit; it counts its getFile calls. */
function stubPort(state: { commit: string | null; content: string | null; fail?: 'listCommits' | 'getFile' }) {
  const calls = { getFile: 0 };
  const port = {
    listCommits: async () => {
      if (state.fail === 'listCommits') throw new Error('glab: 502 Bad Gateway (HTTP 502)');
      return state.commit ? [{ id: state.commit, title: 'ci', committedAt: '2026-10-06T10:00:00Z' }] : [];
    },
    getFile: async () => {
      calls.getFile += 1;
      if (state.fail === 'getFile') throw new Error('glab: 403 Forbidden (HTTP 403)');
      return state.content === null ? null : file(state.content);
    },
  } as unknown as GitLabPort;
  return { port, calls };
}

describe('readArmed: one listCommits per poll, getFile only when the file changed', () => {
  it('reads once, then answers from memory until the newest commit touching the file changes', async () => {
    const state = { commit: 'c1' as string | null, content: ci(block('T4')) as string | null };
    const { port, calls } = stubPort(state);
    const mem = createMemory();
    expect(await readArmed(port, mem, GL, [])).toBe(1);
    expect(await readArmed(port, mem, GL, [])).toBe(1);
    expect(calls.getFile).toBe(1);
    Object.assign(state, { commit: 'c2', content: ci(block('T4'), block('T1')) });
    expect(await readArmed(port, mem, GL, [])).toBe(2);
    expect(calls.getFile).toBe(2);
  });

  it('no CI file, or no default branch: 0 armed, read; a failed read: null and an issue, never 0', async () => {
    expect(await readArmed(stubPort({ commit: null, content: null }).port, createMemory(), GL, [])).toBe(0);
    expect(await readArmed(stubPort({ commit: 'c1', content: 'x' }).port, createMemory(), { ...GL, defaultBranch: null }, [])).toBe(0);
    for (const fail of ['listCommits', 'getFile'] as const) {
      const issues: string[] = [];
      const mem = createMemory();
      expect(await readArmed(stubPort({ commit: 'c1', content: ci(block('T4')), fail }).port, mem, GL, issues)).toBeNull();
      expect(issues).toEqual([expect.stringMatching(/^armed tracks: \.gitlab-ci\.yml on main not read \(glab: \d{3} .+\); shown as unknown$/)]);
      expect(mem.ciFiles.size).toBe(0); // nothing remembered: the next poll reads again
    }
  });
});

describe('the poll writes armed', () => {
  it('ledgerline: 1 from its CI file; a second poll of the unchanged file fetches nothing; a failed read writes null', async () => {
    const r = await rig();
    let ciReads = 0;
    const counting = new Proxy(r.gl.port, {
      get: (t, k, rcv) => (k === 'getFile' ? (p: number, path: string, ref: string) => ((ciReads += path === CI_FILE ? 1 : 0), t.getFile(p, path, ref)) : Reflect.get(t, k, rcv)),
    });
    await r.poll(undefined, counting);
    expect((await getProjectRow(r.db, 'ledgerline'))?.armed).toBe(1);
    const first = ciReads;
    expect(first).toBeGreaterThan(0);
    await r.poll(undefined, counting);
    expect(ciReads).toBe(first);

    const broken = new Proxy(r.gl.port, { get: (t, k, rcv) => (k === 'listCommits' ? () => Promise.reject(new Error('glab: 502 Bad Gateway (HTTP 502)')) : Reflect.get(t, k, rcv)) });
    const cycle = await r.poll(undefined, broken);
    expect((await getProjectRow(r.db, 'ledgerline'))?.armed).toBeNull();
    expect(cycle.projects.find((p) => p.id === 'ledgerline')?.issues.some((i) => i.startsWith('armed tracks:'))).toBe(true);
  });
});
