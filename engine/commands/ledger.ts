// engine/cli.ts ledger append --event event.json --chain events.jsonl [--write]
// Prints the new hash-chained line. The chain is verified first: a broken chain is never extended. With --write the
// read, verify and append all run under `<chain>.lock`, so a concurrent append waits or is refused, never forks.
// `ledger trial` (the auditor's recompute of a promotion's trial) is audit/trial.ts.
import fs from 'node:fs';
import path from 'node:path';
import { append, parseChainText, parseEventBody, verifyChain, type EventBody, type LedgerEvent } from '../../src/schemas/ledger';
import { strictChainLine } from '../../src/schemas/chain/strict';
import { parseArgs } from '../core/args';
import { errno, readJson, readText } from '../core/files';
import { EngineError, isoMs, isRecord, type CommandResult, type Ctx } from '../core/types';
import { TRIAL_USAGE, trialCommand } from './audit/trial';

/** A GitLab id: a safe integer >= 0, as the server reader (src/server/ledger/parse.ts) takes it; 2 ** 53 and 1e300 are integers too. */
function id(v: unknown, what: string): void {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new EngineError(`${what} must be a non-negative integer`);
}

/**
 * The event the writer takes, by the one parser the importer and the checker share (src/schemas/chain/parse.ts), after the
 * writer's own stricter rules: `at` an ISO instant with its zone (isoMs), and ids that are safe integers.
 */
export function parseLedgerEvent(raw: unknown): EventBody {
  if (isRecord(raw)) {
    isoMs(raw.at, 'event.at');
    const s = raw.subject;
    if (isRecord(s)) for (const k of ['project_id', 'iid'] as const) id(s[k], `event.subject.${k}`);
  }
  const r = parseEventBody(raw);
  if (!r.ok) throw new EngineError(`event: ${r.reason}`);
  return r.event;
}

/**
 * A stored chain, every line parsed as the importer parses it (the shared parser and the stored chain's stricter rules,
 * strictChainLine): a chain the importer would refuse is never extended.
 */
export function readChain(text: string): LedgerEvent[] {
  const r = parseChainText(text, strictChainLine);
  if (!r.ok) throw new EngineError(`chain line ${r.line}: ${r.reason}; it is not extended`);
  return r.events;
}

/** The write, as the reads are: a chain it cannot write names its file and errno (EACCES, EROFS, ENOSPC), not `unexpected`. */
function appendLine(file: string, data: string): void {
  try {
    fs.appendFileSync(file, data);
  } catch (e) {
    throw new EngineError(`cannot write ${file} (${errno(e)})`);
  }
}

export const LOCK_TRIES = 20;
const LOCK_WAIT_MS = 50;
const pause = (ms: number): void => void Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Runs `fn` holding `<chain>.lock`, created exclusively (O_EXCL), so two jobs appending at once cannot both extend the
 * same tail with the same seq. A lock still held after LOCK_TRIES waits is a named refusal, never a fork.
 */
export function withChainLock<T>(file: string, fn: () => T): T {
  const lock = `${file}.lock`;
  for (let i = 1; ; i++) {
    try {
      fs.closeSync(fs.openSync(lock, 'wx'));
      break;
    } catch (e) {
      if (errno(e) !== 'EEXIST') throw new EngineError(`cannot write ${file} (${errno(e)})`);
      if (i >= LOCK_TRIES) throw new EngineError(`the chain is locked by another writer (${lock}); it is not extended: retry, or remove the lock if no append is running`);
      pause(LOCK_WAIT_MS);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

export function ledgerCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  if (argv[0] === 'trial') return trialCommand(argv.slice(1), ctx);
  const args = parseArgs(argv, { values: ['event', 'chain'], switches: ['write'], positional: 1 });
  if (args.positional[0] !== 'append') throw new EngineError(`usage: ledger append --event <event.json> --chain <events.jsonl> [--write] | ${TRIAL_USAGE}`);
  const chainFile = path.resolve(ctx.cwd, args.need('chain'));
  const event = parseLedgerEvent(readJson(ctx, args.need('event')));
  const write = args.has('write');
  const extend = () => {
    const text = fs.existsSync(chainFile) ? readText(ctx, chainFile) : ''; // no chain yet is genesis; a directory is an error
    const chain = readChain(text);
    const broken = verifyChain(chain);
    if (broken !== null) throw new EngineError(`the chain is broken at seq ${broken}; it is not extended`);
    const line = append(chain, event);
    // a chain fetched from the API may lack its final newline: start a new line rather than glue two events together
    const lead = text === '' || text.endsWith('\n') ? '' : '\n';
    if (write) appendLine(chainFile, `${lead}${JSON.stringify(line)}\n`);
    return { line, n: chain.length + 1 };
  };
  const { line, n } = write ? withChainLock(chainFile, extend) : extend();
  return { json: line, summary: `ledger: appended seq ${line.seq} ${line.kind} ${line.hash.slice(0, 12)} (chain of ${n} verifies)`, code: 0, compact: true };
}
