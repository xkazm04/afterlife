import { describe, expect, it } from 'vitest';
import { fence } from '@/server/gitlab/fake/demo/notes';
import { extractBlocks, withoutBlocks } from '../parse/blocks';
import { parseGuardrailBlock } from '../parse/guardrail';
import { parseLabels } from '../parse/labels';
import { parseProofBlock } from '../parse/proofBlock';
import { lastTrailer, parseTrailers, proseOf, TASK_ID } from '../parse/trailers';
import { goodProof } from './proofs';

describe('fenced blocks', () => {
  it('reads every valid block with the tag, in order, and ignores a malformed one', () => {
    const text = ['intro', fence('belay-proof', { a: 1 }), 'between', '```belay-proof\n{not json}\n```', fence('belay-proof', { a: 2 }), fence('belay-medic', { z: 1 })].join('\n');
    expect(extractBlocks(text, 'belay-proof')).toEqual([{ a: 1 }, { a: 2 }]);
    expect(extractBlocks(text, 'belay-medic')).toEqual([{ z: 1 }]);
  });

  it('does not take a longer tag for a shorter one, and reads CRLF text', () => {
    expect(extractBlocks('```belay-proof-extra\n{"a":1}\n```', 'belay-proof')).toEqual([]);
    expect(extractBlocks('```belay-proof\r\n{"a":1}\r\n```', 'belay-proof')).toEqual([{ a: 1 }]);
  });

  it('survives a backtick inside the JSON, because the writer escapes it', () => {
    const [v] = extractBlocks(fence('belay-proof', { text: 'run `rm -rf` ``` now' }), 'belay-proof') as Array<{ text: string }>;
    expect(v?.text).toBe('run `rm -rf` ``` now');
  });

  it('strips blocks from prose', () => {
    expect(withoutBlocks('a\n```x\nb\n```\nc')).toBe('a\n\nc');
  });
});

describe('trailers', () => {
  it('takes the last valid line and matches the key case-insensitively', () => {
    const text = 'words\n\nBelay-Task: 01J8Q4\nbelay-task: 01J8QB\nBelay-Class: dep-bump.patch';
    expect(parseTrailers(text)).toEqual({ task: '01J8QB', class: 'dep-bump.patch', finding: null });
  });

  it('rejects a value with the wrong shape instead of repairing it', () => {
    expect(parseTrailers('Belay-Task: not a ulid!\nBelay-Class: Bad Class')).toEqual({ task: null, class: null, finding: null });
    expect(TASK_ID.test('01J9ZK3Q7M8E2V4N6R1T5XWABC')).toBe(true);
    expect(TASK_ID.test('01J9ZK3Q7M8E2V4N6R1T5XWABCD')).toBe(false); // 27 characters
    expect(TASK_ID.test('0ILOU')).toBe(false); // I, L, O, U are not Crockford
  });

  it('ignores a trailer inside a fenced block', () => {
    expect(lastTrailer('```x\nBelay-Task: 01J8Q4\n```', 'Belay-Task', TASK_ID)).toBeNull();
  });

  it('proseOf is the agent’s words without blocks and trailers', () => {
    const d = `I fixed it.\n\n${fence('belay-claims', { c: 1 })}\n\nBelay-Task: 01J8Q4\nBelay-Finding: V-204\n`;
    expect(proseOf(d)).toBe('I fixed it.');
    expect(parseTrailers(d).finding).toBe('V-204');
  });
});

describe('labels', () => {
  it('reads proof, guardrail and tier', () => {
    expect(parseLabels(['proof::pass', 'guardrail::pass', 'belay::tier::hands_off', 'bug'])).toEqual({ proof: 'pass', guardrail: 'pass', tier: 'hands_off' });
  });

  it('resolves conflicts to the more restrictive reading', () => {
    expect(parseLabels(['proof::pass', 'proof::fail', 'guardrail::pass', 'guardrail::block', 'belay::tier::hands_off', 'belay::tier::assisted'])).toEqual({
      proof: 'fail', guardrail: 'block', tier: 'assisted',
    });
    expect(parseLabels(['proof::bogus', 'belay::tier::godmode'])).toEqual({ proof: null, guardrail: null, tier: null });
  });
});

describe('proof block validation', () => {
  it('accepts a block whose verdict follows from its checks', () => {
    const r = parseProofBlock(goodProof());
    expect(r.ok && r.block.verdict).toBe('pass');
  });

  it('rejects a verdict that its checks do not give (the same rule as the gate)', () => {
    const b = goodProof();
    b.checks[0] = { ...b.checks[0]!, ok: false };
    expect(parseProofBlock(b)).toEqual({ ok: false, reason: 'verdict pass does not follow from the checks' });
  });

  it('rejects the wrong schema, a bad class, a missing engine pin and mistyped fields', () => {
    expect(parseProofBlock({ ...goodProof(), schema: 'belay.proof/2' }).ok).toBe(false);
    expect(parseProofBlock({ ...goodProof(), class: 'vibes' }).ok).toBe(false);
    expect(parseProofBlock({ ...goodProof(), engine: { version: 'v1' } }).ok).toBe(false);
    expect(parseProofBlock({ ...goodProof(), checks: [{ name: 1 }] }).ok).toBe(false);
    expect(parseProofBlock({ ...goodProof(), task: { ...goodProof().task, head_sha: 12 } }).ok).toBe(false);
    expect(parseProofBlock('pass').ok).toBe(false);
    expect(parseProofBlock({ class: 'dep-bump.patch', verdict: 'pass' }).ok).toBe(false);
  });

  it('keeps head_sha when present and works without it', () => {
    const withSha = parseProofBlock(goodProof('a'.repeat(40)));
    expect(withSha.ok && withSha.block.task.head_sha).toBe('a'.repeat(40));
    const without = parseProofBlock(goodProof());
    expect(without.ok && 'head_sha' in without.block.task).toBe(false);
  });
});

describe('guardrail block validation', () => {
  const good = { schema: 'belay.guardrail/1', verdict: 'block', head_sha: 'b'.repeat(40), findings: [{ rule: 'prompt-injection', severity: 'high', file: 'ci.yml', quote: '+ x', explanation: 'why' }] };

  it('reads a valid block', () => {
    expect(parseGuardrailBlock(good)).toMatchObject({ verdict: 'block', headSha: 'b'.repeat(40), findings: [{ severity: 'high', quote: '+ x' }] });
  });

  it('rejects anything else', () => {
    expect(parseGuardrailBlock({ ...good, verdict: 'maybe' })).toBeNull();
    expect(parseGuardrailBlock({ ...good, findings: [{ rule: 'x', severity: 'critical', file: 'f', quote: '', explanation: '' }] })).toBeNull();
    expect(parseGuardrailBlock({ ...good, schema: 'other' })).toBeNull();
    expect(parseGuardrailBlock(null)).toBeNull();
  });
});

describe('fenced blocks on hostile text', () => {
  const hostile = '```belay-proof\nx '.repeat(70_000); // 1 MB of unclosed openers

  it('withoutBlocks scans 1 MB of unclosed openers in under 500 ms', () => {
    const t = performance.now();
    expect(withoutBlocks(hostile)).toBe(hostile);
    expect(performance.now() - t).toBeLessThan(500);
  });

  it('extractBlocks scans 1 MB of unclosed openers in under 500 ms', () => {
    const t = performance.now();
    expect(extractBlocks(hostile, 'belay-proof')).toEqual([]);
    expect(performance.now() - t).toBeLessThan(500);
  });

  it('withoutBlocks stays linear on openers with no line break at all', () => {
    const t = performance.now();
    expect(withoutBlocks('```'.repeat(350_000))).toBe('```'.repeat(350_000));
    expect(performance.now() - t).toBeLessThan(500);
  });
});
