// The pure parts: the stream parser (table), the fleet loader, the plan parser, the prompt version.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStream } from '../agent/stream';
import { loadFleet } from '../fleet/load';
import { lanePrompt, parsePlan } from '../wave/plan';
import { loadPrompts } from '../wave/prompts';
import { readClaim } from '../lane/run';
import { gateTail } from '../lane/verify';

const line = (o: unknown) => JSON.stringify(o);

describe('parseStream', () => {
  const result = { type: 'result', subtype: 'success', is_error: false, result: 'all done', total_cost_usd: 0.42, usage: { input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 }, modelUsage: { 'claude-x': {} } };
  it.each([
    ['full stream', [line({ type: 'system', model: 'init-model' }), line(result)].join('\n'), { text: 'all done', costUsd: 0.42, model: 'claude-x', usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }, isError: false }],
    ['no modelUsage keeps the init model', [line({ type: 'system', model: 'init-model' }), line({ ...result, modelUsage: undefined })].join('\n'), { model: 'init-model', costUsd: 0.42 }],
    ['killed stream: last assistant text, no usage, no cost', [line({ type: 'assistant', message: { content: [{ type: 'text', text: 'half' }] } }), '{"type":"assis'].join('\n'), { text: 'half', usage: null, costUsd: null, model: null }],
    ['error result', line({ type: 'result', subtype: 'error_max_turns', is_error: true, result: '' }), { isError: true, text: '', usage: null }],
    ['a real zero cost is kept', line({ ...result, total_cost_usd: 0 }), { costUsd: 0 }],
    ['non-json noise is skipped', ['warning: x', '', line(result)].join('\r\n'), { text: 'all done' }],
    ['empty', '', { text: '', usage: null, costUsd: null, isError: false }],
  ])('%s', (_name, stdout, want) => {
    expect(parseStream(stdout)).toMatchObject(want);
  });
});

describe('gateTail', () => {
  it('strips colour codes, keeps the last frame of a \\r progress line, puts stderr after stdout', () => {
    expect(gateTail('\x1b[1m\x1b[32mok\x1b[0m 3 passed\n 10%\r 50%\r100%\n', '\x1b[31merror[E0308]\x1b[0m: mismatched types\n')).toBe('ok 3 passed\n100%\nerror[E0308]: mismatched types');
    expect(gateTail('', '')).toBe('');
  });
  it('keeps only the tail of a long output', () => {
    const t = gateTail(`${'x'.repeat(5000)}END`, '', 1200);
    expect(t).toHaveLength(1203);
    expect(t.startsWith('...')).toBe(true);
    expect(t.endsWith('END')).toBe(true);
  });
});

describe('readClaim', () => {
  it('takes the last DONE/PARK line', () => {
    expect(readClaim('x\nDONE: first\nPARK: later')).toEqual({ kind: 'PARK', rest: 'later' });
    expect(readClaim('DONE: ok')).toEqual({ kind: 'DONE', rest: 'ok' });
    expect(readClaim('no claim here')).toBeNull();
  });
});

describe('loadFleet', () => {
  const write = (body: string) => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'belay-fleet-')), 'fleet.yml');
    fs.writeFileSync(f, body);
    return f;
  };
  it('parses repos, gates and optional caps', () => {
    const fleet = loadFleet(write('repos:\n  - slug: a\n    path: /x\n    base: main\n    laneCapUsd: 2\n    gates: [npm test, npm run lint]\n  - slug: b\n    path: /y\n    base: dev\n    gates: [make]\n'));
    expect(fleet).toEqual([
      { slug: 'a', path: '/x', base: 'main', gates: ['npm test', 'npm run lint'], laneCapUsd: 2 },
      { slug: 'b', path: '/y', base: 'dev', gates: ['make'] },
    ]);
  });
  it('keeps a setup list, and leaves the key out when there is none', () => {
    const [a] = loadFleet(write('repos:\n  - {slug: a, path: /x, base: main, gates: [t], setup: [npm ci]}\n'));
    expect(a).toEqual({ slug: 'a', path: '/x', base: 'main', gates: ['t'], setup: ['npm ci'] });
    expect(() => loadFleet(write('repos:\n  - {slug: a, path: /x, base: main, gates: [t], setup: npm ci}\n'))).toThrow();
  });
  it('keeps laneTools prefixes and refuses a bare launcher or shell syntax', () => {
    const [a] = loadFleet(write('repos:\n  - {slug: a, path: /x, base: main, gates: [t], laneTools: [npx vitest run, " cargo check "]}\n'));
    expect(a?.laneTools).toEqual(['npx vitest run', 'cargo check']);
    for (const bad of ['[npx]', '["npx vitest; curl x"]', '["Bash(x)"]', 'npx vitest']) {
      expect(() => loadFleet(write(`repos:\n  - {slug: a, path: /x, base: main, gates: [t], laneTools: ${bad}}\n`))).toThrow(/laneTools/);
    }
  });
  it.each([
    ['no repos', 'repos: []\n'],
    ['no gates', 'repos:\n  - {slug: a, path: /x, base: main, gates: []}\n'],
    ['bad slug', 'repos:\n  - {slug: "A b", path: /x, base: main, gates: [x]}\n'],
    ['duplicate slug', 'repos:\n  - {slug: a, path: /x, base: main, gates: [x]}\n  - {slug: a, path: /y, base: main, gates: [x]}\n'],
    ['bad cap', 'repos:\n  - {slug: a, path: /x, base: main, gates: [x], waveCapUsd: -1}\n'],
  ])('rejects %s', (_n, body) => {
    expect(() => loadFleet(write(body))).toThrow();
  });
  it('the committed example parses and names the three repos', () => {
    expect(loadFleet(path.resolve(import.meta.dirname, '../fleet.example.yml')).map((r) => r.slug)).toEqual(['athena-portable', 'paypal', 'gravitone-gcloud']);
  });
});

describe('parsePlan and prompts', () => {
  it('keeps well-formed lines, drops the rest, dedupes lanes, caps the count', () => {
    const text = ['not json', '{"lane":"Fix A","title":"Fix a","files":["a.ts"],"why":"a.ts:1","challenge":"c"}', '{"lane":"fix-a","title":"dup"}', '{"lane":"b"}', '{"lane":"c","title":"C"}', '{"lane":"d","title":"D"}'].join('\n');
    expect(parsePlan(text, 2).map((i) => i.lane)).toEqual(['fix-a', 'c']);
  });
  it('the lane prompt lists the gates and the commands the lane may run', () => {
    const item = { lane: 'a', title: 'A', files: ['a.rs'], why: 'a.rs:1', challenge: 'c' };
    const p = lanePrompt('BASE', item, 3, { gates: ['cargo fmt --all --check', 'cargo test --workspace'], commands: ['cargo fmt', 'cargo check'] });
    expect(p).toContain('  - cargo fmt --all --check\n  - cargo test --workspace');
    expect(p).toContain('  - cargo fmt ...\n  - cargo check ...');
    expect(p).toMatch(/run the cheap ones: the formatter/);
    expect(p.trimEnd().endsWith('<!-- belay:step=lane lane=a -->')).toBe(true);
    expect(lanePrompt('BASE', item, 3, { gates: ['make'], commands: [] })).toContain('you cannot run a shell check');
  });
  it('promptVersion is 12 hex, stable, and a missing dir falls back on all three', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-prompts-'));
    const p = loadPrompts(empty);
    expect(p.version).toMatch(/^[0-9a-f]{12}$/);
    expect(p.fallback).toEqual(['plan', 'lane', 'reflect']);
    expect(loadPrompts(empty).version).toBe(p.version);
    fs.writeFileSync(path.join(empty, 'plan.md'), 'hello');
    const q = loadPrompts(empty);
    expect(q.version).not.toBe(p.version);
    expect(q.fallback).toEqual(['lane', 'reflect']);
  });
});
