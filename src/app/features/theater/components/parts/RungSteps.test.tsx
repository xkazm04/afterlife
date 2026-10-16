import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RUNGS } from '@/schemas/stages';
import { RungSteps } from './RungSteps';

const html = (rung: number, evidence = false) => renderToStaticMarkup(createElement(RungSteps, { rung, evidence }));
const steps = (h: string) => h.match(/<i/g)?.length ?? 0;
const filled = (h: string) => h.match(/<i class=/g)?.length ?? 0;

describe('RungSteps', () => {
  it('draws one step per rung above absent and fills up to the rung', () => {
    for (let r = 0; r < RUNGS.length; r += 1) {
      expect(steps(html(r))).toBe(RUNGS.length - 1);
      expect(filled(html(r))).toBe(r);
    }
  });
  it('is the only place that draws the bar: Board and StageRows carry no step loop or step styles of their own', () => {
    const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const f of ['stage/Board.tsx', 'rail/StageRows.tsx']) {
      expect(read(f)).toContain('<RungSteps');
      expect(read(f)).not.toMatch(/\[1, 2, 3, 4\]/);
    }
    for (const f of ['stage/Board.module.css', 'rail/Rail.module.css']) expect(read(f)).not.toMatch(/\bi\.on\b/);
  });
});
