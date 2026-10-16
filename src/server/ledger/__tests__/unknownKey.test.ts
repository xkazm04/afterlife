// A line carrying a key this reader does not know is newer than the reader, not tampered: say that, naming key and line.
import { describe, expect, it } from 'vitest';
import { ledgerEvents } from '@/server/gitlab/fake/demo';
import { SEED_NOW } from '@/server/index/seed/parse';
import { LedgerParseError, parseLedgerJsonl } from '../parse';

const lines = (): string[] => ledgerEvents(SEED_NOW).map((e) => JSON.stringify(e));

describe('parseLedgerJsonl on an unknown key', () => {
  it('refuses a top-level key it does not know, naming the key and the line', () => {
    const l = lines();
    l[1] = JSON.stringify({ ...JSON.parse(l[1] ?? ''), quorum: 3 });
    expect(() => parseLedgerJsonl(l.join('\n'))).toThrow(LedgerParseError);
    expect(() => parseLedgerJsonl(l.join('\n'))).toThrow(/line 2.*quorum/);
  });

  it('still reads every known key', () => {
    expect(parseLedgerJsonl(lines().join('\n'))).toHaveLength(lines().length);
  });
});
