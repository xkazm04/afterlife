// belay-ledger/events/<project-id>.jsonl: one LedgerEvent per line. The file is read from a GitLab repository, so every
// line is checked field by field before it is trusted; a bad line fails the whole import (the chain is all or nothing).
// The rules are the one parser the engine's writer and ledger-record checker share (src/schemas/chain/parse.ts), and the
// stored chain's stricter ones on top (src/schemas/chain/strict.ts, which `ledger append` reads by too): no unknown key,
// `at` as the engine writes it (isoMs), and safe-integer ids.
import { parseChainText, type LedgerEvent } from '@/schemas/ledger';
import { strictChainLine } from '@/schemas/chain/strict';

export class LedgerParseError extends Error {
  constructor(readonly line: number, reason: string) {
    super(`ledger line ${line}: ${reason}`);
    this.name = 'LedgerParseError';
  }
}

/**
 * Parses a whole file. Blank lines are skipped; any other bad line throws LedgerParseError with its number. The stricter
 * rules judge each line's one parse, after the shared ones pass on it: the first bad line wins, and on one line the shared
 * reason does.
 */
export function parseLedgerJsonl(text: string): LedgerEvent[] {
  const r = parseChainText(text, strictChainLine);
  if (!r.ok) throw new LedgerParseError(r.line, r.reason);
  return r.events;
}
