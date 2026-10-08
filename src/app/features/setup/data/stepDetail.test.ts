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

const TOKENS = ['BELAY_BOT_TOKEN', 'BELAY_POLICY_TOKEN', 'BELAY_DISPATCH_TOKEN', 'BELAY_LEDGER_TOKEN'];

describe('step 8 sets the four tokens on belay-apply, and only there (F4 b)', () => {
  it('Setup and the skill name all four, on belay-apply, never a group variable, with the pipeline-variable role', () => {
    for (const text of [STEP_DETAIL[8]!.note ?? '', skillStep(8)]) {
      for (const t of TOKENS) expect(text).toContain(t);
      expect(text).toMatch(/belay-apply only/);
      expect(text).toMatch(/never (on a target and never )?a group or instance variable/);
      expect(text).toContain('no_one_allowed');
      expect(text).toMatch(/Masked and hidden/);
      expect(text).toMatch(/schedule/);
    }
    expect(STEP_DETAIL[8]!.where).toContain('belay-apply');
  });
  it('shows no command that sets a token, and still shows the model key', () => {
    expect(STEP_DETAIL[8]!.cmd).toEqual(['glab variable set ANTHROPIC_API_KEY --masked --protected']);
  });
});

describe('step 9 protects belay-apply, the job token allowlists, the v* tags and the ledger (F4 c, F39)', () => {
  const text = [STEP_DETAIL[9]!.does, skillStep(9)];
  it('says each protection in Setup and the skill', () => {
    for (const t of text) {
      expect(t).toMatch(/belay-apply: main takes no push|belay-apply.s `main`: push No one/);
      expect(t).toMatch(/Code Owner approval/);
      expect(t).toMatch(/job token allowlists of belay-engine and belay-policy/);
      expect(t).toMatch(/v* tags of belay-engine and belay-pack/);
      expect(t).toMatch(/`?main`? of belay-ledger/);
      expect(t).toMatch(/guards no token/);
    }
  });
  it('has a command for each API-settable protection, and none with a placeholder', () => {
    const cmd = STEP_DETAIL[9]!.cmd ?? [];
    expect(cmd.some((c) => c.includes('acme-lab%2Fbelay-apply/protected_branches') && c.includes('push_access_level=0') && c.includes('code_owner_approval_required=true') && c.includes('allow_force_push=false'))).toBe(true);
    for (const p of ['belay-engine', 'belay-pack']) expect(cmd.some((c) => c.includes(`${p}/protected_tags`) && c.includes("'name=v*'"))).toBe(true);
    for (const c of cmd) expect(c).not.toMatch(/…|[.]{3}/);
  });
});

describe('every command a step shows runs (F4 f)', () => {
  it('shows no belay command but doctor, no placeholder and no && chain', () => {
    for (const d of Object.values(STEP_DETAIL)) {
      for (const c of d.cmd ?? []) {
        if (/belay/.test(c) && !c.startsWith('glab')) expect(c).toBe('npx belay doctor');
        expect(c).not.toMatch(/…|[.]{3}|&&/);
      }
    }
  });
});
