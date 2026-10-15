// belay-ledger/events/<project-id>.jsonl: one LedgerEvent per line. The file is read from a GitLab repository, so every
// line is checked field by field before it is trusted; a bad line fails the whole import (the chain is all or nothing).
// The rules are the one parser the engine's writer and ledger-record checker share (src/schemas/chain/parse.ts).
import { parseChainText, type LedgerEvent } from '@/schemas/ledger';

export class LedgerParseError extends Error {
  constructor(readonly line: number, reason: string) {
    super(`ledger line ${line}: ${reason}`);
    this.name = 'LedgerParseError';
  }
}

/** Parses a whole file. Blank lines are skipped; any other bad line throws LedgerParseError with its number. */
export function parseLedgerJsonl(text: string): LedgerEvent[] {
  const r = parseChainText(text);
  if (!r.ok) throw new LedgerParseError(r.line, r.reason);
  return r.events;
}
