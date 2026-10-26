// A gap is sent through the server's gap door, with the files Maturity's proposal data holds: a new file as its '+' lines,
// a change to an existing file as the hunk (never as the file). Probes, gaps without files, and (in live mode) gaps whose
// files are demo fixtures are not sent, and say why.
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { PROPOSAL_EXTRAS } from '../data/proposals';
import { DEMO_CONTENT, gapSend, NO_FILES, NOT_BUILT } from './gap';

vi.mock('@/server/actions/actions', () => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));

const proposal = (id: string) => {
  const p = DEMO.maturity.proposals.find((x) => x.id === id);
  if (!p) throw new Error(`no proposal ${id}`);
  return p;
};

describe('the gap intent', () => {
  it('g1: the existing CI file is a hunk, the new job file is its + lines', () => {
    const r = gapSend('ledgerline', proposal('g1'), 'demo');
    if (!r.ok) throw new Error(r.reason);
    expect(r.intent).toMatchObject({ kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 3, to: 4, branch: 'belay/gap-g1-sbom-rederive', workItem: 131 });
    const [ci, job] = r.intent.files;
    expect(ci).toMatchObject({ path: '.gitlab-ci.yml', hunk: expect.arrayContaining(['+  - local: .gitlab/belay/sbom-rederive.yml']) });
    expect(ci).not.toHaveProperty('content');
    expect(job).toMatchObject({ path: '.gitlab/belay/sbom-rederive.yml', content: expect.stringMatching(/^# Afterlife T6 .*maturity gap g1/) });
    const content = (job as { content: string }).content;
    expect(content).not.toMatch(/^\+/m);
    expect(content.endsWith('\n')).toBe(true);
  });
  it('the files are read from the proposal data, not copied', () => {
    const r = gapSend('ledgerline', proposal('g2'), 'demo');
    if (!r.ok) throw new Error(r.reason);
    expect(r.intent.files).toHaveLength(PROPOSAL_EXTRAS.g2?.files.length ?? -1);
  });
});

describe('what is not sent', () => {
  it('the probe has no server door yet', () => {
    expect(gapSend('ledgerline', proposal('g4'), 'demo')).toEqual({ ok: false, reason: NOT_BUILT });
  });
  it('a gap with no proposal files has no MR to open', () => {
    const none = { ...PROPOSAL_EXTRAS.g1, files: [] } as NonNullable<(typeof PROPOSAL_EXTRAS)['g1']>;
    expect(gapSend('ledgerline', proposal('g1'), 'demo', { g1: none })).toEqual({ ok: false, reason: NO_FILES });
  });
  it('the screen refuses what the server refuses: nine files, a hunk with no context line', async () => {
    const { parseIntent } = await import('@/server/actions/intents');
    const base = PROPOSAL_EXTRAS.g1 as NonNullable<(typeof PROPOSAL_EXTRAS)['g1']>;
    const file = (i: number, lines: string[], isNew = false) => ({ path: `f${i}.yml`, isNew, lines });
    const variants = {
      nine: Array.from({ length: 9 }, (_, i) => file(i, [' ctx', '+add'])),
      eight: Array.from({ length: 8 }, (_, i) => file(i, [' ctx', '+add'])),
      noContext: [file(0, ['+add', '+add2'])],
    };
    for (const [name, files] of Object.entries(variants)) {
      const r = gapSend('ledgerline', proposal('g1'), 'demo', { g1: { ...base, files } });
      const server = r.ok ? parseIntent(JSON.parse(JSON.stringify(r.intent))).ok : false;
      expect(r.ok, name).toBe(name === 'eight');
      if (r.ok) expect(server, name).toBe(true);
      else expect(r).toEqual({ ok: false, reason: NO_FILES });
    }
    const hunkless = { ...base, files: [file(0, ['+add', '+add2'])] };
    const raw = { kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 3, to: 4, title: 't', branch: 'belay/gap-g1-x', files: [{ path: 'f0.yml', hunk: hunkless.files[0]?.lines }] };
    expect(parseIntent(raw).ok).toBe(false);
  });
  it('LIVE SAFETY: in live mode a gap whose files are the demo fixture is never sent to a real project', () => {
    for (const id of ['g1', 'g2', 'g3']) {
      expect(gapSend('ledgerline', proposal(id), 'live'), id).toEqual({ ok: false, reason: DEMO_CONTENT });
    }
    expect(DEMO_CONTENT).toMatch(/demo fixture/);
  });
});
