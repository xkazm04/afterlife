// n5's runner check is the demo's simulation: the inspector names no job, no flag doctor lacks, and says it is simulated.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
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
  it('the unknown chip and the Checked row quote one age, typed once', () => {
    const demo = pickNeedsYouDemo();
    const out = renderToStaticMarkup(<InspRunner s={{ ...initialState(demo), sel: 'n5' }} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out.match(/2 h old/g)).toHaveLength(2);
    const src = readFileSync(join(__dirname, 'InspRunner.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/2 h old/g)).toHaveLength(1);
  });
});
