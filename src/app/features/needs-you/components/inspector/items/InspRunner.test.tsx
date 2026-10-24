// n5's runner check is the demo's simulation: the inspector names no job, no flag doctor lacks, and says it is simulated.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { RUNNER } from '../../../data/runner';
import { rowView } from '../../../model/rows/rowData';
import { initialState } from '../../../model/state';
import { InspRunner } from './InspRunner';

describe('InspRunner', () => {
  const demo = pickNeedsYouDemo();
  const base = initialState(demo);
  const html = (check: 'ok' | 'none' | null) =>
    renderToStaticMarkup(<InspRunner s={{ ...base, sel: 'n5', runner: { opened: check !== null, check } }} demo={demo} leftSec={0} dispatch={() => {}} />);

  it('claims no job number and no flag doctor lacks, and marks the result simulated', () => {
    for (const check of ['ok', 'none', null] as const) {
      const out = html(check);
      expect(out).not.toContain('job #');
      expect(out).not.toContain('--only');
      expect(out).not.toContain('--json');
      expect(out).toContain('npx belay doctor');
    }
    expect(html('ok')).toContain('simulated');
  });
});

describe('InspRunner age', () => {
  it('the unknown chip, the Checked row and the list row chip quote one age, from data/runner.ts', () => {
    const demo = pickNeedsYouDemo();
    const s = { ...initialState(demo), sel: 'n5' };
    const out = renderToStaticMarkup(<InspRunner s={s} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out.split(RUNNER.checkedAgo)).toHaveLength(3);
    expect(rowView(s, 'n5', demo)?.move).toMatchObject({ title: `Unknown · checked ${RUNNER.checkedAgo}` });
    for (const f of [join(__dirname, 'InspRunner.tsx'), join(__dirname, '../../../model/rows/rowData.ts')]) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/\b2 h (old|ago)\b/);
    }
  });
});
