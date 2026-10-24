// lib.mjs reads MR text that anyone with a comment box wrote: it must stay linear on hostile input and fail closed on paging.
// validate.mjs is the only check a flow's JSON gets before the engine reads it (custom flows cannot set response_schema_id).
// It must (1) judge only a value's OWN keys, never ones inherited from Object.prototype, and (2) understand every keyword the
// shipped schemas use: a keyword it does not know is a constraint that is silently not enforced.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT, SCRIPTS } from '../../testing/harness.mjs';
import { engine, tsxCommand } from '../engine.mjs';
import { blocks, pageAll, trailer } from '../lib.mjs';
import trailerCases from '../fixtures/trailer-cases.json' with { type: 'json' };
import { validate } from '../validate.mjs';

describe('blocks', () => {
  it('reads fenced blocks, LF or CRLF, in order, and ignores malformed ones', () => {
    const text = 'x\n```t\n{"a":1}\n```\nmid\r\n```t\r\n{"a":2}\r\n```\n```t\nnot json\n```\n```other\n{"a":9}\n```';
    expect(blocks(text, 't')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('keeps a backtick-free body that spans lines', () => {
    expect(blocks('```t\n{\n  "a": [1,\n 2]\n}\n```', 't')).toEqual([{ a: [1, 2] }]);
  });

  it('scans 1 MB of unclosed openers in under 500 ms', () => {
    const hostile = '```t\nx '.repeat(150_000);
    const t = performance.now();
    expect(blocks(hostile, 't')).toEqual([]);
    expect(performance.now() - t).toBeLessThan(500);
  });
});

const SCHEMAS = path.resolve(SCRIPTS, '..', '..', 'flows', 'schemas');
const strict = { type: 'object', required: ['verdict'], additionalProperties: false, properties: { verdict: { enum: ['pass', 'block'] } } };

describe('validate', () => {
  it('accepts a conforming value and names each problem with its path', () => {
    expect(validate({ verdict: 'pass' }, strict)).toEqual([]);
    expect(validate({ verdict: 'maybe', extra: 1 }, strict)).toEqual(['$.verdict: must be one of pass, block', '$: unexpected extra']);
    expect(validate({}, strict)).toEqual(['$: missing verdict']);
    expect(validate([], strict)).toEqual(['$: expected object, got array']);
  });

  it('checks items, lengths, patterns, bounds and integers', () => {
    const s = { type: 'array', minItems: 1, items: { type: 'object', properties: { n: { type: 'integer', minimum: 1, maximum: 3 }, s: { type: 'string', minLength: 2, maxLength: 3, pattern: '^[a-z]+$' } } } };
    expect(validate([], s)).toEqual(['$: fewer than 1 items']);
    expect(validate([{ n: 2, s: 'ab' }], s)).toEqual([]);
    expect(validate([{ n: 1.5 }, { n: 4 }, { s: 'A' }, { s: 'abcd' }], s)).toEqual([
      '$[0].n: expected integer, got number',
      '$[1].n: above 3',
      '$[2].s: shorter than 2',
      '$[2].s: does not match ^[a-z]+$',
      '$[3].s: longer than 3',
    ]);
  });

  // JSON.parse makes "constructor" an own key; the schema's `properties` lookup used to find Object's inherited one instead.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'])('additionalProperties:false rejects a smuggled "%s" key', (key) => {
    const smuggled = JSON.parse(`{"verdict":"pass","${key}":{"x":1}}`);
    expect(validate(smuggled, strict)).toEqual([`$: unexpected ${key}`]);
  });

  it('a required key must be the value’s own, not an inherited one', () => {
    expect(validate({}, { type: 'object', required: ['toString'] })).toEqual(['$: missing toString']);
  });
});

/** Every keyword that constrains a value in a schema, found by walking the places a schema can sit. */
function keywordsOf(schema, out = new Set()) {
  if (schema === null || typeof schema !== 'object') return out;
  for (const k of Object.keys(schema)) if (!k.startsWith('$') && !['title', 'description', 'default', 'examples'].includes(k)) out.add(k);
  for (const p of Object.values(schema.properties ?? {})) keywordsOf(p, out);
  if (schema.items) keywordsOf(schema.items, out);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') keywordsOf(schema.additionalProperties, out);
  return out;
}

describe('the shipped flow schemas', () => {
  const SUPPORTED = new Set(['type', 'enum', 'const', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum']);
  const files = fs.readdirSync(SCHEMAS).filter((f) => f.endsWith('.schema.json'));

  it('are found', () => expect(files.length).toBeGreaterThanOrEqual(6));

  it.each(files)('%s uses only keywords validate.mjs enforces', (f) => {
    const used = [...keywordsOf(JSON.parse(fs.readFileSync(path.join(SCHEMAS, f), 'utf8')))];
    expect(used.filter((k) => !SUPPORTED.has(k))).toEqual([]);
  });

  it('the keyword walk bites: an unknown keyword is reported', () => {
    expect([...keywordsOf({ type: 'object', properties: { a: { oneOf: [] } } })].filter((k) => !SUPPORTED.has(k))).toEqual(['oneOf']);
  });
});

describe('engine', () => {
  it('runs the checkout’s own tsx with this node, and falls back to npx when there is none', () => {
    expect(tsxCommand(ROOT)).toMatchObject({ cmd: process.execPath, shell: false });
    expect(tsxCommand(ROOT).args[0]).toMatch(/node_modules[\\/]tsx[\\/]dist[\\/]cli\.mjs$/);
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-engine-'));
    try {
      expect(tsxCommand(bare)).toMatchObject({ cmd: 'npx', args: ['tsx'] });
    } finally {
      fs.rmSync(bare, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });

  it('answers as npx tsx does: same exit code and stdout for an unknown command', () => {
    const env = { ...process.env, BELAY_DIR: ROOT, npm_config_offline: 'true', npm_config_cache: path.join(os.tmpdir(), 'belay-npmcache') };
    const viaNpx = spawnSync('npx', ['tsx', 'engine/cli.ts', 'no-such-command'], { cwd: ROOT, encoding: 'utf8', env, shell: process.platform === 'win32' });
    const saved = process.env.BELAY_DIR;
    process.env.BELAY_DIR = ROOT;
    try {
      expect(engine(['no-such-command'])).toEqual({ code: viaNpx.status, stdout: viaNpx.stdout });
    } finally {
      if (saved === undefined) delete process.env.BELAY_DIR;
      else process.env.BELAY_DIR = saved;
    }
  }, 60_000);

  // The poller reads the same cases (src/server/poller/__tests__/parse.test.ts): one trailer rule, two readers.
  it.each(trailerCases)('reads a trailer as the poller does: $name', ({ text, key, want }) => {
    expect(trailer(text, key)).toBe(want);
  });
});

describe('pageAll: the paging rule every apiAll reader and test double shares', () => {
  const full = (n) => Array.from({ length: 100 }, (_, i) => ({ n, i }));
  /** A reader that answers each page from `pages` (an array of rows) and records the paths asked. */
  const reader = (pages) => {
    const asked = [];
    return { asked, get: (p) => (asked.push(p), pages[Number(new URLSearchParams(p.split('?')[1]).get('page')) - 1]) };
  };

  it('stops at a short page without asking for the next', () => {
    const r = reader([full(1), [{ n: 2 }]]);
    expect(pageAll(r.get, 'x?a=1', 5)).toHaveLength(101);
    expect(r.asked).toEqual(['x?a=1&per_page=100&page=1', 'x?a=1&per_page=100&page=2']);
  });

  it('stops at an empty or non-array page, and starts a bare path with ?', () => {
    const r = reader([full(1), [], full(3)]);
    expect(pageAll(r.get, 'x', 5)).toHaveLength(100);
    expect(r.asked[0]).toBe('x?per_page=100&page=1');
    expect(pageAll(() => null, 'x', 5)).toEqual([]);
  });

  it('stops at the page cap even when every page is full', () => {
    const r = reader([full(1), full(2), full(3)]);
    expect(pageAll(r.get, 'x', 2)).toHaveLength(200);
    expect(r.asked).toHaveLength(2);
  });

  it('strict: a cap reached with a full last page throws instead of returning a prefix as the whole', () => {
    const r = reader([full(1), full(2), full(3)]);
    expect(() => pageAll(r.get, 'x', 2, { strict: true })).toThrow(/more than 200 rows .*refusing to guess/);
  });

  it('strict: a list that ends before the cap is returned whole', () => {
    expect(pageAll(reader([full(1), [{ n: 2 }]]).get, 'x', 2, { strict: true })).toHaveLength(101);
    expect(pageAll(reader([full(1), []]).get, 'x', 2, { strict: true })).toHaveLength(100);
  });
});
