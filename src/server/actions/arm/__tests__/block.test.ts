import { describe, expect, it } from 'vitest';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { armBlock, findBlock, insertBlock, removeBlock, scalar } from '../block';
import { blockerOf, holdsBlock } from '../checks';
import { DEMO_PIN } from '../config';
import { armOf } from '../content';

const t4 = armOf('T4')!;
const wanted = t4.includes(DEMO_PIN);
const PIPELINE = 'stages: [build, test, review]\n\ninclude:\n    - template: Jobs/SAST.gitlab-ci.yml # scanners\n\ntest:\n  script: make test\n';

describe('the arm block', () => {
  it('goes into the top-level include list at its indent, and nowhere else', () => {
    const r = insertBlock(PIPELINE, t4, 'acme-lab', DEMO_PIN);
    if (!r.ok) throw new Error(r.reason);
    expect(r.after).toBe(3);
    expect(r.added[0]).toMatch(/^ {4}# belay:arm T4 guardrail begin [0-9a-f]{12}$/);
    expect(r.added[1]).toBe('    - component: $CI_SERVER_FQDN/acme-lab/belay-pack/proof-engine@1.0.0');
    expect(r.content.split('\n').filter((l) => !r.added.includes(l))).toEqual(PIPELINE.split('\n'));
    expect(holdsBlock(r.content, wanted)).toBe(true);
    expect(findBlock(r.content, t4)).toMatchObject({ state: 'armed', from: 3 });
  });

  it('brings include: itself when the file has none, and removing it gives the file back', () => {
    const plain = 'stages: [build, review]\nbuild:\n  script: make\n';
    const r = insertBlock(plain, t4, 'g', DEMO_PIN);
    if (!r.ok) throw new Error(r.reason);
    expect(r.added[1]).toBe('include:');
    expect(holdsBlock(r.content, wanted)).toBe(true);
    const back = removeBlock(r.content, t4);
    expect(back.ok && back.content).toBe(plain);
  });

  it('a disarm removes exactly the lines the arm added', () => {
    const r = insertBlock(PIPELINE, t4, 'acme-lab', DEMO_PIN);
    if (!r.ok) throw new Error(r.reason);
    const back = removeBlock(r.content, t4);
    if (!back.ok) throw new Error(back.found.state);
    expect(back.content).toBe(PIPELINE);
    expect(back.removed).toEqual(r.added);
  });

  it('a block edited after the arm is not removed', () => {
    const r = insertBlock(PIPELINE, t4, 'acme-lab', DEMO_PIN);
    if (!r.ok) throw new Error(r.reason);
    const edited = r.content.replace('stage: review', 'stage: test');
    expect(findBlock(edited, t4).state).toBe('edited');
    expect(removeBlock(edited, t4)).toMatchObject({ ok: false, found: { state: 'edited' } });
    expect(findBlock(PIPELINE, t4).state).toBe('absent');
  });

  it('refuses a one-line or mapping include rather than rewrite it', () => {
    expect(insertBlock('include: other.yml\n', t4, 'g', DEMO_PIN).ok).toBe(false);
    expect(insertBlock('include: [a.yml]\n', t4, 'g', DEMO_PIN).ok).toBe(false);
    expect(insertBlock('include:\n  local: a.yml\n', t4, 'g', DEMO_PIN).ok).toBe(false);
  });

  it('quotes a value YAML would read as something else', () => {
    expect(scalar('v0.1.0')).toBe('v0.1.0');
    expect(scalar('0000000000000000000000000000000000000000')).toBe("'0000000000000000000000000000000000000000'");
    expect(scalar('yes')).toBe("'yes'");
    expect(scalar(4711)).toBe('4711');
  });

  it("the demo group's ledgerline has T4 armed exactly as the arm writes it", () => {
    expect(findBlock(LEDGERLINE_CI, t4).state).toBe('armed');
    expect(LEDGERLINE_CI).toContain(armBlock(t4, 'acme-lab', DEMO_PIN, '  ', false).join('\n'));
  });
});

describe('what must already be in the pipeline', () => {
  it('the stages T4 runs in; the default stages have no review', () => {
    expect(blockerOf(PIPELINE.replace('stages: [build, test, review]', 'stages: [build, test]'), t4, wanted)).toMatch(/no review stage/);
    expect(blockerOf('build:\n  script: make\n', t4, wanted)).toMatch(/no review stage/);
    expect(blockerOf(PIPELINE, t4, wanted)).toBeNull();
  });
  it('no include of the same component by hand, and valid YAML', () => {
    const byHand = PIPELINE.replace('    - template', '    - component: $CI_SERVER_FQDN/x/belay-pack/flow-dispatch@1.0.0\n    - template');
    expect(blockerOf(byHand, t4, wanted)).toMatch(/already includes flow-dispatch by hand/);
    expect(blockerOf('stages: [\n', t4, wanted)).toMatch(/not valid YAML/);
  });
});
