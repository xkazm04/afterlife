// Setup and the adopt-belay skill do the same steps under the same numbers: where one names a thing to create or protect,
// so does the other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEP_DETAIL } from './stepDetail';

const SKILL = readFileSync(join(process.cwd(), 'skills/adopt-belay/SKILL.md'), 'utf8');
const skillStep = (n: number): string => SKILL.split('\n').find((l) => l.startsWith(`| ${n} |`)) ?? '';

describe('step 9 protects the agents’ branches (F38 part 4)', () => {
  it('Setup makes belay/* a protected branch pattern only Maintainers and the flow accounts push to', () => {
    const d = STEP_DETAIL[9]!;
    expect(d.does).toMatch(/belay\/\* a protected branch pattern that only Maintainers and the flow accounts can push to/);
    expect(d.cmd?.some((c) => c.includes('protected_branches') && c.includes("name=belay/*") && c.includes('push_access_level=40'))).toBe(true);
  });

  it('the skill’s step 9 says the same', () => {
    expect(skillStep(9)).toMatch(/`belay\/\*` a protected branch pattern that only Maintainers and the flow accounts can push to/);
  });
});
