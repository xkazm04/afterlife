import { describe, expect, it } from 'vitest';
import { NODES } from './nodes';

const codes = (key: string): string[] =>
  (NODES.find((n) => n.key === key)?.commands({ host: 'gitlab.com', groupId: '1' }) ?? []).flatMap((l) =>
    typeof l === 'string' ? [l] : l.code ? [l.code] : [],
  );

describe('trace nodes', () => {
  it('gives every env command a POSIX and a PowerShell line, and no cmd.exe set', () => {
    const env = NODES.filter((n) => n.restart);
    expect(env.map((n) => n.key)).toEqual(['group', 'live']);
    for (const n of env) {
      const c = codes(n.key);
      const name = n.key === 'group' ? 'BELAY_GROUP_ID' : 'BELAY_MODE';
      expect(c.some((l) => new RegExp(`^(export )?${name}=`).test(l))).toBe(true);
      expect(c.some((l) => l.startsWith(`$env:${name}=`))).toBe(true);
      expect(c.some((l) => l.startsWith('set '))).toBe(false);
    }
  });
});
