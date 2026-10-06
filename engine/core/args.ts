// A small argument parser: `--key value`, `--key=value`, repeatable keys, and boolean switches.
import { EngineError } from './types';

export interface Args {
  positional: string[];
  get(key: string): string | undefined;
  all(key: string): string[];
  has(key: string): boolean;
  need(key: string): string;
}

export function parseArgs(argv: readonly string[], opts: { values: readonly string[]; switches?: readonly string[] }): Args {
  const flags = new Map<string, string[]>();
  const positional: string[] = [];
  const switches = new Set(opts.switches ?? []);
  const values = new Set(opts.values);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = a.slice(2, eq === -1 ? undefined : eq);
    if (switches.has(key)) {
      flags.set(key, [...(flags.get(key) ?? []), 'true']);
      continue;
    }
    if (!values.has(key)) throw new EngineError(`unknown option --${key}`);
    let value: string | undefined;
    if (eq !== -1) value = a.slice(eq + 1);
    else {
      value = argv[++i];
      if (value === undefined) throw new EngineError(`option --${key} needs a value`);
    }
    flags.set(key, [...(flags.get(key) ?? []), value]);
  }
  return {
    positional,
    get: (k) => flags.get(k)?.at(-1),
    all: (k) => flags.get(k) ?? [],
    has: (k) => flags.has(k),
    need(k) {
      const v = flags.get(k)?.at(-1);
      if (v === undefined || v === '') throw new EngineError(`missing --${k}`);
      return v;
    },
  };
}
