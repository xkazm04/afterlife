// What README.md ("Untrusted text", and "No flow has a tool that merges, approves, labels ...") says of every flow file, held
// here rather than by a scratch lint: a prompt holds no brace but a declared placeholder (`{{...}}` is the template syntax),
// the goal and the finding sit inside <untrusted_*> tags, every prompt a component names exists, and no toolset can merge,
// approve or label.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const DIR = import.meta.dirname;
const FLOWS = fs.readdirSync(DIR).filter((f) => f.endsWith('.yml')).sort();
/** Tool names that grant, merge or label. The flows write claims and notes only; CI jobs set every label and grant. */
const GRANTS = /approve|label|^merge_|accept_merge|_merge$|tier_state/;
const UNTRUSTED = ['goal', 'finding'];

it('reads every flow file, so the checks below are not empty', () => expect(FLOWS.length).toBeGreaterThanOrEqual(6));

describe.each(FLOWS)('%s', (file) => {
  const flow = parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const components = flow.components ?? [];
  const prompts = new Map((flow.prompts ?? []).map((p) => [p.prompt_id, p]));

  it('every component names a prompt the file declares', () => {
    for (const c of components.filter((x) => x.prompt_id)) expect(prompts.has(c.prompt_id), `${c.name} -> ${c.prompt_id}`).toBe(true);
  });

  it('no toolset can merge, approve or label', () => {
    for (const c of components) for (const tool of c.toolset ?? []) expect(tool, `${c.name}`).not.toMatch(GRANTS);
  });

  it('a prompt holds no brace but a placeholder its component declares, and the goal and finding sit in <untrusted_*> tags', () => {
    for (const c of components.filter((x) => x.prompt_id)) {
      const declared = new Set((c.inputs ?? []).map((i) => (typeof i === 'string' ? i : i.as)));
      for (const [part, text] of Object.entries(prompts.get(c.prompt_id)?.prompt_template ?? {})) {
        const where = `${c.prompt_id}.${part}`;
        const holes = [...String(text).matchAll(/\{\{([a-z_]+)\}\}/g)];
        for (const [, name] of holes) expect(declared.has(name), `${where}: {{${name}}} is not an input of ${c.name}`).toBe(true);
        expect(String(text).replace(/\{\{[a-z_]+\}\}/g, ''), `${where}: a brace outside a placeholder`).not.toMatch(/[{}]/);
        for (const [, name] of holes.filter(([, n]) => UNTRUSTED.includes(n))) {
          expect(String(text), `${where}: {{${name}}} outside <untrusted_${name}>`).toMatch(new RegExp(`<untrusted_${name}>\\s*\\{\\{${name}\\}\\}\\s*</untrusted_${name}>`));
        }
      }
    }
  });
});
