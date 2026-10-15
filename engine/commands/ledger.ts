// belay ledger append --event event.json --chain events.jsonl [--write]
// Prints the new hash-chained line. The chain is verified first: a broken chain is never extended.
// `ledger trial` (the auditor's recompute of a promotion's trial) is audit/trial.ts.
import fs from 'node:fs';
import path from 'node:path';
import { append, parseChainText, parseEventBody, verifyChain, type EventBody, type LedgerEvent } from '../../src/schemas/ledger';
import { parseArgs } from '../core/args';
import { readJson } from '../core/files';
import { EngineError, type CommandResult, type Ctx } from '../core/types';
import { TRIAL_USAGE, trialCommand } from './audit/trial';

/** The event the writer takes, by the one parser the importer and the checker share (src/schemas/chain/parse.ts). */
export function parseLedgerEvent(raw: unknown): EventBody {
  const r = parseEventBody(raw);
  if (!r.ok) throw new EngineError(`event: ${r.reason}`);
  return r.event;
}

/** A stored chain, every line parsed as the importer parses it: a chain with a bad line is never extended. */
export function readChain(text: string): LedgerEvent[] {
  const r = parseChainText(text);
  if (!r.ok) throw new EngineError(`chain line ${r.line}: ${r.reason}; it is not extended`);
  return r.events;
}

export function ledgerCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  if (argv[0] === 'trial') return trialCommand(argv.slice(1), ctx);
  const args = parseArgs(argv, { values: ['event', 'chain'], switches: ['write'] });
  if (args.positional[0] !== 'append') throw new EngineError(`usage: ledger append --event <file> --chain <events.jsonl> [--write] | ${TRIAL_USAGE}`);
  const chainFile = path.resolve(ctx.cwd, args.need('chain'));
  const chain = fs.existsSync(chainFile) ? readChain(fs.readFileSync(chainFile, 'utf8')) : [];
  const broken = verifyChain(chain);
  if (broken !== null) throw new EngineError(`the chain is broken at seq ${broken}; it is not extended`);
  const line = append(chain, parseLedgerEvent(readJson(ctx, args.need('event'))));
  if (args.has('write')) fs.appendFileSync(chainFile, `${JSON.stringify(line)}\n`);
  return { json: line, summary: `ledger: appended seq ${line.seq} ${line.kind} ${line.hash.slice(0, 12)} (chain of ${chain.length + 1} verifies)`, code: 0, compact: true };
}
