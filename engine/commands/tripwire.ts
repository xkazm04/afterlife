// belay tripwire --policy P --state S --event event.json
// Exit 0 whether it demoted or not (the JSON says which); exit 2 when the input is wrong.
import { parseArgs } from '../core/args';
import { readInput, readText } from '../core/files';
import type { CommandResult, Ctx } from '../core/types';
import { parseEvent, tripwire } from '../decide/tripwire';
import { loadPolicy } from '../policy/load';
import { DEFAULT_POLICY, DEFAULT_STATE } from './prove';

export function tripwireCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['policy', 'state', 'event'] });
  const policy = loadPolicy(ctx, args.get('policy') ?? DEFAULT_POLICY);
  const statePath = args.get('state') ?? DEFAULT_STATE;
  const event = parseEvent(readInput(ctx, args.need('event')));
  const r = tripwire(policy, readText(ctx, statePath), statePath, event, ctx.now());
  const lines = [`tripwire ${event.trigger}: ${r.demote ? 'DEMOTE' : 'no change'}`, `  ${r.note}`];
  if (r.commit) lines.push(`  commit ${r.commit.path}: ${r.commit.message.split('\n')[0] ?? ''}`);
  return { json: { demote: r.demote, commit: r.commit, note: r.note }, summary: lines.join('\n'), code: 0 };
}
