// lib.mjs reads MR text that anyone with a comment box wrote: it must stay linear on hostile input and fail closed on paging.
import { describe, expect, it } from 'vitest';
import { blocks } from './lib.mjs';

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
