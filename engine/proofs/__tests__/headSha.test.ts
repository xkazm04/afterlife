import { describe, expect, it } from 'vitest';
import { fixture, NOW, policy } from '../../__tests__/helpers';
import { prove } from '../index';

const env = { policy: policy(), now: NOW };
const SHA = 'c0ffee0000000000000000000000000000000001';

describe('proof task.head_sha', () => {
  const input = fixture('cited', 'input.grounded.json') as { task: Record<string, unknown> };

  it('is emitted when the input carries the head the engine read', () => {
    const b = prove('cited-diff', { ...input, task: { ...input.task, head_sha: SHA } }, env);
    expect(b.task.head_sha).toBe(SHA);
  });

  it('is left out when the input does not carry it', () => {
    const b = prove('cited-diff', input, env);
    expect('head_sha' in b.task).toBe(false);
  });

  it('refuses a head_sha that is not a string', () => {
    expect(() => prove('cited-diff', { ...input, task: { ...input.task, head_sha: 12 } }, env)).toThrow(/task.head_sha/);
  });
});
