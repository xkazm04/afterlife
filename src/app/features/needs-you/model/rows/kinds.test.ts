// The inbox vocabulary is a union, so a sixth kind is a compile error wherever the kinds are worded (the server map and
// the two screen lists). The pin is the @ts-expect-error: `npm run typecheck` fails when the line stops being an error.
import { describe, expect, it } from 'vitest';
import type { NeedsYouItem } from '@/lib/demo';

describe('NeedsYouItem kind', () => {
  it('rejects a kind nobody worded', () => {
    // @ts-expect-error 'sixth' is not one of promote, signoff, gaps, readmit, setup
    const bad: NeedsYouItem['kind'] = 'sixth';
    const good: NeedsYouItem['kind'] = 'readmit';
    expect([bad, good]).toHaveLength(2);
  });
});
