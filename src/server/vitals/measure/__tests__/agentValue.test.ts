// The agent's figure is displayed, never decides: no file of the measure step reads `agentValue`, and the same runs
// give the same verdict whatever the claim's own number says.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendAdjustment, appendCiRuns } from '../../store';
import { passiveWith } from '../passive';
import { claim, tempData, tenRuns } from './fixture';

tempData();

describe('the agent value never reaches the verdict', () => {
  it('no measure source names agentValue', () => {
    const dir = path.resolve(import.meta.dirname, '..');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files.filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes('agentValue'))).toEqual([]);
  });

  it('a claim of 90 % and one of -50 % get the same measurement', async () => {
    appendCiRuns('grinex', tenRuns());
    appendAdjustment('grinex', claim({ id: 'a', agentValue: 90, expectedPct: 90 }));
    appendAdjustment('grinex', claim({ id: 'b', agentValue: -50, expectedPct: 1 }));
    const a = await passiveWith('grinex', 'a', 5);
    const b = await passiveWith('grinex', 'b', 5);
    const strip = (r: typeof a) => (r.status === 'measured' ? { ...r.measurement, id: '', at: '' } : r);
    expect(strip(a)).toEqual(strip(b));
  });
});
