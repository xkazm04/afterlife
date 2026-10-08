// Setup and the adopt-belay skill do the same steps under the same numbers: where one names a thing to create or protect,
// so does the other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BELAY_PROJECTS } from '@/server/data/setup/read';
import { DEMO_NAMES, STEP_DETAIL } from './stepDetail';

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

describe('step 4 creates the same projects in Setup and the skill', () => {
  it('the skill creates every project Setup’s step 4 does, belay-engine included (components clone it at engine_ref)', () => {
    // Live Setup's step 4 names the target and BELAY_PROJECTS (the paired read), which include belay-engine.
    expect(BELAY_PROJECTS).toContain('belay-engine');
    expect(BELAY_PROJECTS).toContain('belay-apply');
    for (const p of ['target', ...BELAY_PROJECTS]) expect(skillStep(4)).toContain(p);
  });
});

describe('the demo names every project step 4 creates', () => {
  it('DEMO_NAMES.projects holds the target and every one of BELAY_PROJECTS', () => {
    expect(DEMO_NAMES.projects).toContain(DEMO_NAMES.project);
    for (const p of BELAY_PROJECTS) expect(DEMO_NAMES.projects).toContain(p);
    expect(DEMO_NAMES.projects).toHaveLength(BELAY_PROJECTS.length + 1);
    expect(STEP_DETAIL[4]!.probe).toBe(`${DEMO_NAMES.projects.length} of ${DEMO_NAMES.projects.length} projects exist`);
  });
});
