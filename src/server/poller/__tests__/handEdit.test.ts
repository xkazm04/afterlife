// tier-state.yml is a file a person may edit by hand. The gate reads a record by its tier alone (engine/policy/load.ts), so
// a record without `by` (or with one that is not text) still binds every merge request. The screens must read it too:
// the poll that met one threw, and every project kept the tier it showed before, higher than the gate acts on (F51).
import { describe, expect, it } from 'vitest';
import { getActionClasses } from '@/server/index/views';
import { rig } from './helpers';

describe('poll cycle: a tier record a person wrote by hand', () => {
  for (const [name, record] of [['no by', '{ tier: quarantined }'], ['a by that is not text', '{ tier: quarantined, by: 12, since: 2026-10-01 }']] as const) {
    it(`shows a class lowered with ${name} at the tier the gate acts on`, async () => {
      const r = await rig();
      await r.poll();
      const before = Object.fromEntries((await getActionClasses(r.db, 'ledgerline', new Date())).map((c) => [c.id, c.tier]));
      expect(before['qa.file-bug']).toBe('supervised');
      const policy = r.gl.state.projects.find((p) => p.raw.name === 'belay-policy');
      if (!policy) throw new Error('no belay-policy');
      const text = policy.files['tier-state.yml'] ?? '';
      policy.files['tier-state.yml'] = text.replace(/qa\.file-bug: \{[^}]*\}/, `qa.file-bug: ${record}`);
      expect(policy.files['tier-state.yml']).not.toBe(text);

      const second = await r.poll();
      expect(second.projects.filter((p) => !p.ok).map((p) => p.error)).toEqual([]);
      const after = Object.fromEntries((await getActionClasses(r.db, 'ledgerline', new Date())).map((c) => [c.id, c.tier]));
      expect(after['qa.file-bug']).toBe('quarantined');
    });
  }
});
