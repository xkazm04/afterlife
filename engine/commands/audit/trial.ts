// belay ledger trial --chain events.jsonl --agent A --class C --since T [--through N] [--head H]
// The audit a promotion MR asks for, in one command: the belay-ledger file is cut at the seq the MR states (`--through`;
// events after it are the chain growing since, not the MR's statement), verified from genesis, anchored to the head hash
// the MR states (`--head`), and the holder's next-rung trial row is recomputed from it by the ledger-record checker's rule
// (trialFromChain). No task block, no input.json. Exit 0: the row; 1: a chain that does not verify, or not the chain
// the MR names; 2: a short or bad input.
import { parseChainText, verifyChain } from '../../../src/schemas/ledger';
import { parseArgs } from '../../core/args';
import { readText } from '../../core/files';
import { EngineError, isoMs, type CommandResult, type Ctx } from '../../core/types';
import { chainBreaks, trialFromChain } from '../../proofs/checkers/ledgerRecord';

export const TRIAL_USAGE = 'ledger trial --chain <events.jsonl> --agent <a> --class <id> --since <iso> [--through <seq>] [--head <sha256>]';

const HASH = /^[0-9a-f]{64}$/;

function throughOf(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new EngineError(`--through must be a seq (a positive integer), not ${v}`);
  return n;
}

export function trialCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['chain', 'agent', 'class', 'since', 'through', 'head'], positional: 0 });
  const [file, agent, classId, since] = [args.need('chain'), args.need('agent'), args.need('class'), args.need('since')];
  const from = isoMs(since, '--since'); // as ledger-record reads record.since: Date.parse('10') is 2001
  const through = throughOf(args.get('through'));
  const stated = args.get('head');
  if (stated !== undefined && !HASH.test(stated)) throw new EngineError('--head must be a sha256 (64 lowercase hex)');

  const read = parseChainText(readText(ctx, file));
  if (!read.ok) {
    const reason = `chain line ${read.line}: ${read.reason}`;
    return { json: { verifies: false, reason }, summary: `ledger trial: ${reason}; it states nothing`, code: 1 };
  }
  const last = read.events.at(-1)?.seq ?? 0;
  if (through !== null && through > last) throw new EngineError(`--through ${through}: the chain ends at seq ${last}`);
  const chain = through === null ? read.events : read.events.filter((e) => e.seq <= through);
  const end = chain.at(-1);
  const head = { seq: end?.seq ?? 0, hash: end?.hash ?? null };

  const broken = verifyChain(chain);
  if (broken !== null) {
    const reason = chainBreaks(broken);
    return { json: { verifies: false, head, reason }, summary: `ledger trial: ${reason}; it states nothing`, code: 1 };
  }
  if (stated !== undefined && stated !== head.hash) {
    const reason = `seq ${head.seq} is ${head.hash ?? 'absent'}, not ${stated}: this file is not the chain the MR names`;
    return { json: { verifies: true, head, reason }, summary: `ledger trial: ${reason}`, code: 1 };
  }

  const trial = trialFromChain(chain, { agent, classId, from });
  const summary = [
    `ledger trial ${agent} ${classId}: ${trial.mrs.length} trial MR(s), ${trial.n} resolved, ${trial.catches} caught (chain verifies to seq ${head.seq})`,
    ...trial.mrs.map((m) => `  !${m.iid} seq ${m.seq ?? '?'} ${m.resolution}`),
  ].join('\n');
  return { json: { verifies: true, head, trial }, summary, code: 0 };
}
