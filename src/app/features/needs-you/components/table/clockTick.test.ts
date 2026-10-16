// The one-second clock tick must re-render only the readers of the value. React state re-renders the component that owns
// it and every child element that component creates, so the instrument is structural: the file that calls useElapsed
// must not also build the table or the band, and the table's props must not carry the tick down to every row.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const code = (rel: string) =>
  readFileSync(path.join(root, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the 1 s clock tick', () => {
  it('is owned by a file that builds neither the decisions table nor the band', () => {
    const owner = code('NeedsYouScreen.tsx');
    const ticks = /useElapsed\s*\(|useClock\w*\s*\(/.test(owner);
    const builds = /<DecisionsTable|<CraBand|<DecisionRow/.test(owner);
    expect(ticks && builds).toBe(false);
  });

  it('does not travel down the table as a prop to every row', () => {
    expect(code('components/table/DecisionsTable.tsx')).not.toMatch(/\bleftSec\b/);
    expect(code('components/table/DecisionRow.tsx')).not.toMatch(/\bleftSec\b/);
  });
});
