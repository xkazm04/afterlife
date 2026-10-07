// F30: a template's belay-* project defaults follow the target's own namespace, never the top-level group.
import { expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';

const dir = path.resolve(import.meta.dirname, '../templates');
const INPUTS = ['engine_project', 'policy_project', 'ledger_project'];

for (const name of fs.readdirSync(dir)) {
  const file = path.join(dir, name, 'template.yml');
  if (!fs.existsSync(file)) continue;
  it(`${name}: project defaults do not name $CI_PROJECT_ROOT_NAMESPACE`, () => {
    const spec = parseAllDocuments(fs.readFileSync(file, 'utf8'))[0].toJS().spec.inputs;
    for (const k of INPUTS) {
      if (!(k in spec)) continue;
      expect(spec[k], `${k} keeps a default`).toHaveProperty('default');
      expect(String(spec[k].default), `${k} default`).not.toMatch(/CI_PROJECT_ROOT_NAMESPACE/);
    }
  });
}
