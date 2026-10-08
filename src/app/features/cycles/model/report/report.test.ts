import { describe, expect, it } from 'vitest';
import { DEMO, DEMO_CYCLES } from '@/lib/demo';
import { buildCycles } from '../build';
import { cycleReport, postCommand, reportTitle } from './report';
const { cycles: CLOSED_CYCLES, today: TODAY, cadence: CADENCE_DAYS } = DEMO_CYCLES;

const data = buildCycles(DEMO.maturity, CLOSED_CYCLES, { project: 'acme-lab/ledgerline', today: TODAY, cadence: CADENCE_DAYS });
const C = (id: string) => data.cycles.find((c) => c.id === id)!;

describe('the cycle report', () => {
  it('states the cycle, its net and the rungs held after it (not today)', () => {
    const r = cycleReport(C('C2'), data);
    expect(r).toMatch(/^# C2 · Make tests count/);
    expect(r).toContain('**+2 rungs.** 2 credited, 0 resolved by a probe, 1 not earned, 0 drift caught. After C2 the project held 7 of 36 (day 0: 2).');
  });
  it('lists every change in the table, and names misses and drift in their own sections', () => {
    const r = cycleReport(C('C4'), data);
    for (const c of C('C4').changes) expect(r).toContain(`| ${c.stage} |`);
    expect(r).toContain('## Drift caught');
    expect(r).toContain('- verify fell R3 → R2');
    expect(cycleReport(C('C5'), data)).toContain('## Not earned (carried forward)\n\n- !21 monitor');
  });
  it('states both proofs as they stand, and what runs next', () => {
    const r = cycleReport(C('C6'), data);
    expect(r).toContain('equals the 14:02 scan');
    expect(r).toContain('The chain holds');
    expect(r).toContain('## Next: C7 · Secure and Create (running)');
  });
  it('says so when the replay does not match the scan', () => {
    const r = cycleReport(C('C6'), { ...data, drift: ['monitor'] });
    expect(r).toContain('does NOT match the 14:02 scan on: monitor');
  });
  it('posts as an issue with the exact command, from a file', () => {
    expect(reportTitle(C('C6'), 'acme-lab/ledgerline')).toBe('Afterlife C6 · Block the critical · acme-lab/ledgerline');
    expect(postCommand(C('C6'), 'acme-lab/ledgerline')).toBe(
      'glab issue create -R acme-lab/ledgerline --title "Afterlife C6 · Block the critical · acme-lab/ledgerline" --label afterlife::cycle --description "$(cat c6-report.md)"',
    );
  });
});
