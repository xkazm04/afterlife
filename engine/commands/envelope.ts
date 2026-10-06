// belay envelope --policy policy/trust-policy.yml --class <id> --diff <file> [--env <name>]...
import { parseArgs } from '../core/args';
import { readText } from '../core/files';
import type { CommandResult, Ctx } from '../core/types';
import { checkEnvelope } from '../policy/envelope';
import { loadPolicy } from '../policy/load';
import { DEFAULT_POLICY } from './prove';

export function envelopeCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['policy', 'class', 'diff', 'env'] });
  const policy = loadPolicy(ctx, args.get('policy') ?? DEFAULT_POLICY);
  const r = checkEnvelope(policy, args.need('class'), readText(ctx, args.need('diff')), args.all('env'));
  const head = `envelope ${r.class}: ${r.within ? 'WITHIN' : 'OUTSIDE'} (${r.files} files, ${r.lines} lines${r.environments.length ? `, to ${r.environments.join(', ')}` : ''})`;
  return { json: r, summary: [head, ...r.violations.map((v) => `  - ${v}`)].join('\n'), code: r.within ? 0 : 1 };
}
