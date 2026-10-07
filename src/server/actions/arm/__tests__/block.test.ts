import { describe, expect, it } from 'vitest';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { armBlock, findBlock, insertBlock, removeBlock, scalar } from '../block';
import { blockerOf, holdsBlock, placementOf } from '../checks';
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
  it('the stage T4 runs in: cited-diff in review when the pipeline declares it, else in test', () => {
    expect(placementOf(PIPELINE, t4)).toEqual({ 'proof-engine': 'review' });
    const testOnly = 'stages: [build, test, secure, package, deploy]\nbuild:\n  script: make\n';
    expect(placementOf(testOnly, t4)).toEqual({ 'proof-engine': 'test' });
    expect(placementOf('build:\n  script: make\n', t4)).toEqual({ 'proof-engine': 'test' }); // GitLab's defaults
    expect(placementOf('stages: [test]\n', t4)).toEqual({ 'proof-engine': 'test' }); // no build stage needed: no flow-dispatch (F4)
    expect(blockerOf(PIPELINE, wanted)).toBeNull();
  });
  it('refuses only when neither review nor test is declared, naming both', () => {
    expect(placementOf('stages: [build, deploy]\n', t4)).toMatch(/proof-engine \(cited-diff\) runs in either a review or a test stage, and the pipeline declares neither review nor test/);
    expect(placementOf('stages: [\n', t4)).toMatch(/not valid YAML/);
  });
  it('a test-only pipeline gets cited-diff in test, and disarm still removes exactly the block', () => {
    const testOnly = 'stages: [build, test]\n\ninclude:\n  - template: Jobs/SAST.gitlab-ci.yml\n';
    const at = placementOf(testOnly, t4);
    if (typeof at === 'string') throw new Error(at);
    const r = insertBlock(testOnly, t4, 'acme-lab', DEMO_PIN, at);
    if (!r.ok) throw new Error(r.reason);
    expect(r.added).toContain('      stage: test');
    expect(r.added).not.toContain('      stage: review');
    expect(holdsBlock(r.content, t4.includes(DEMO_PIN, at))).toBe(true);
    expect(findBlock(r.content, t4).state).toBe('armed');
    const back = removeBlock(r.content, t4);
    expect(back.ok && back.content).toBe(testOnly);
  });
  it('no include of the same component by hand, and valid YAML', () => {
    const byHand = PIPELINE.replace('    - template', '    - component: $CI_SERVER_FQDN/x/belay-pack/proof-engine@1.0.0\n      inputs: { class: cited-diff }\n    - template');
    expect(blockerOf(byHand, wanted)).toMatch(/already includes proof-engine \(cited-diff\) by hand/);
    expect(blockerOf('stages: [\n', wanted)).toMatch(/not valid YAML/);
  });
});
