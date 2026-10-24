// Prints, as JSON, the test files that import any of the given source files (vitest's own `related` import graph).
// `node scripts/test/related.mjs <source files...>`. It lists, it does not run: no test file is executed.
import path from 'node:path';
import { createVitest } from 'vitest/node';

const files = process.argv.slice(2).map((f) => path.resolve(f));
const vitest = await createVitest('test', { related: files, run: true, watch: false, reporters: [], passWithNoTests: true });
try {
  const specs = files.length ? await vitest.getRelevantTestSpecifications([]) : [];
  const root = vitest.config.root;
  const tests = [...new Set(specs.map((s) => path.relative(root, s.moduleId).split(path.sep).join('/')))].sort();
  process.stdout.write(JSON.stringify(tests));
} finally {
  await vitest.close();
}
