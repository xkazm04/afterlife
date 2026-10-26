// Builds the shared, illustrative demo dataset that every prototype reads.
//   node scripts/build-demo.mjs  ->  src/lib/demo/data/belay-demo.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actionClasses, stages, tiers, tracks } from './demo/classes.mjs';
import { fleet, portfolio } from './demo/fleet.mjs';
import { cockpit, events, loop, maturity, needsYou, setup, tasks } from './demo/screens.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const data = {
  _note: 'ILLUSTRATIVE. Every name, number, id and time is a placeholder for layout, not a measurement. Seeded faults are labelled seeded.',
  product: { name: 'Afterlife', claim: 'Agents may act alone only where they can prove it.',
    sub: 'Eight post-code agents on GitLab. Every action carries a machine-checked Proof Block. Autonomy is earned from those proofs and revoked on the first failure.' },
  portfolio, fleet, stages, tracks, actionClasses, tiers, maturity, loop, tasks, needsYou, setup, events, cockpit,
};

const out = path.join(here, '..', 'src', 'lib', 'demo', 'data', 'belay-demo.json');
fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(`wrote ${path.relative(process.cwd(), out)}`);
