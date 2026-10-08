// `belay pair <checkout>`: run by cli/belay.mjs through tsx. Prints the plan; writes only with --write.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pair } from './pair';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.exitCode = pair(process.argv.slice(2), { out: (s) => process.stdout.write(s), err: (s) => process.stderr.write(s), cwd: process.cwd(), root }).code;
