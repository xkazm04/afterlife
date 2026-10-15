import { describe, expect, it } from 'vitest';
import { getActionClasses } from '@/lib/demo';
import type { ActionClass } from '@/lib/demo/types';
import { enrollGate, enrollWhyNot, wouldWrite } from './enroll';

const demo = getActionClasses();
const of = (track: string, over: Partial<ActionClass> = {}): ActionClass[] => demo.filter((c) => c.track === track).map((c) => ({ ...c, ...over }));
const unrecorded = (track: string) => of(track, { cell: 'no_record', tier: 'quarantined' });

describe('the Enroll write on a track page', () => {
  it('is offered for an armed track whose classes hold no record yet', () => {
    expect(enrollGate('armed', unrecorded('T4'))).toEqual({ kind: 'open' });
    expect(enrollWhyNot({ kind: 'open' }, 'T4')).toBeNull();
  });

  it('says why not: unarmed, already enrolled, or never an agent', () => {
    expect(enrollWhyNot(enrollGate('ready', unrecorded('T4')), 'T4')).toBe('Arm T4 and verify it first: enrollment follows the arm.');
    expect(enrollWhyNot(enrollGate('armed', of('T4')), 'T4')).toBe('Already enrolled: guard.block holds a record. Promotion takes it from here, on the Ladder.');
    const t1 = [...unrecorded('T1').slice(0, 1), ...of('T1').slice(1)];
    expect(enrollGate('armed', t1)).toEqual({ kind: 'enrolled', held: ['code-fix.patch'] });
    expect(enrollGate('armed', of('T2').filter((c) => c.ceiling === 'human_only'))).toEqual({ kind: 'none' });
    expect(enrollGate('armed', of('T4', { cell: 'refused' }))).toMatchObject({ kind: 'enrolled' });
  });

  it("a no-record class shows what the enrollment MR would write, from start_tier and its ceiling, never as a grant", () => {
    const [guard] = unrecorded('T4');
    expect(wouldWrite(guard!, 'assisted')).toBe('The enrollment MR would write Assisted (start_tier Assisted, ceiling Hands-off): not granted until a person merges it');
    expect(wouldWrite({ ...guard!, ceiling: 'quarantined' }, 'assisted')).toMatch(/^The enrollment MR would write Quarantined/);
    expect(wouldWrite(guard!, null)).toBe('start_tier was not read: Belay cannot say what an enrollment would write');
    expect(wouldWrite(of('T4')[0]!, 'assisted')).toBeNull(); // it holds a record
  });
});
