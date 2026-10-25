// Responses in the exact shapes `az` printed against App Insights (values invented; no keys, names or emails), and
// a fake exec that answers by argv so a test reads which calls were made.
import type { Exec } from '../../types';

type Reply = { code?: number; stdout?: unknown; stderr?: string };

/** A fake az: the first rule whose `match` every argv token satisfies answers; unmatched calls exit 1. */
export function fakeAz(rules: { match: string[]; reply: Reply }[]): { exec: Exec; calls: string[][] } {
  const calls: string[][] = [];
  const exec: Exec = async (bin, args) => {
    calls.push([bin, ...args]);
    const hit = rules.find((r) => r.match.every((m) => args.includes(m)));
    if (!hit) return { code: 1, stdout: '', stderr: `ERROR: no fake for ${args.join(' ')}`, ms: 1 };
    const out = hit.reply.stdout;
    return { code: hit.reply.code ?? 0, stdout: typeof out === 'string' ? out : JSON.stringify(out ?? null), stderr: hit.reply.stderr ?? '', ms: 3 };
  };
  return { exec, calls };
}

export const SUB = '00000000-0000-4000-8000-000000000001';
export const APP_ID = '11111111-2222-4333-8444-555555555555';
export const COMPONENT = {
  appId: APP_ID,
  name: 'shopfront',
  resourceGroup: 'shop-rg',
  id: `/subscriptions/${SUB}/resourceGroups/shop-rg/providers/microsoft.insights/components/shopfront`,
};

/** `az monitor app-insights query` output: one table, (timestamp, v, n), rows in no particular order. */
export function table(rows: [string, number | null, number][]): unknown {
  return {
    tables: [{
      name: 'PrimaryResult',
      columns: [{ name: 'timestamp', type: 'datetime' }, { name: 'v', type: 'real' }, { name: 'n', type: 'long' }],
      rows,
    }],
  };
}

export const COUNT = (n: number) => ({ tables: [{ name: 'PrimaryResult', columns: [{ name: 'Count', type: 'long' }], rows: [[n]] }] });

export const EXPIRED = [
  'WARNING: This command is from the following extension: application-insights',
  "ERROR: AADSTS700082: The refresh token has expired due to inactivity.",
  "Please run 'az login' to setup account.",
].join('\n');
