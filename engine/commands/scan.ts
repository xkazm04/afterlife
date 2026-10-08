// belay scan --dir <checkout> [--propose]   |   belay scan --facts <facts.json> [--propose]
// Read-only. Scores the nine stages (engine/scan) and prints the cells; --propose adds the next change per stage.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../core/args';
import { readJson } from '../core/files';
import { EngineError, type CommandResult, type Ctx } from '../core/types';
import { engineInfo } from '../core/version';
import { gitlabFacts } from '../scan/gitlabFacts';
import { checkoutFacts } from '../scan/local';
import { propose, scan, summary } from '../scan/scan';

export function scanCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['dir', 'facts'], switches: ['propose'] });
  const facts = args.get('facts');
  const dir = args.get('dir');
  if ((facts === undefined) === (dir === undefined)) throw new EngineError('give exactly one of --dir <checkout> or --facts <facts.json>');
  let f;
  if (facts !== undefined) f = gitlabFacts(readJson(ctx, facts));
  else {
    const root = path.resolve(ctx.cwd, dir as string);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new EngineError(`${dir} is not a directory`);
    f = checkoutFacts(root);
  }
  const s = scan(f, ctx.now());
  const proposals = args.has('propose') ? propose(s) : undefined;
  const json = { ...s, engine: engineInfo(), ...(proposals ? { proposals } : {}) };
  const lines = [summary(s), ...(proposals ? ['', 'next, read only (nothing was written):', ...proposals.map((p) => `  ${p.stage}: R${p.from ?? '?'} -> R${p.to}  ${p.change}`)] : [])];
  return { json, summary: lines.join('\n'), code: s.counts.unknown === s.cells.length ? 2 : 0 };
}
