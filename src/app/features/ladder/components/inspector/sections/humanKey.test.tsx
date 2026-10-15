// The promotion rule's precondition reads the human key back from GitLab: the class page's load (loadHumanKey) through the
// live source on the fake GitLab, then the rule and the promote preview as the screen draws them. Demo: verified, chipped.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { HUMAN_KEY, type Promotion } from '@/lib/promotion';
import { demoSource, liveSource, setDataSource } from '@/server/data';
import { createDemoGitLab, GROUP_ID } from '@/server/gitlab/fake/demo';
import { projectNamed } from '@/server/gitlab/fake/setupDone';
import { loadHumanKey } from '../../../data/loadLadderClass';
import { humanKeyWarning, WRITE_HEAD } from '../../../model/rules/promote';
import { PromotionRule } from './PromotionRule';
import { WriteSection } from './WriteSection';

afterAll(() => setDataSource(null));

const promotion: Promotion = { kind: 'eligible', next: 'hands_off', rules: [{ name: 'accepted outputs', value: '16 / 15', met: true }], precondition: HUMAN_KEY };
const text = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'");

describe('the human key under the promotion rule, read from the fake GitLab', () => {
  const gl = createDemoGitLab();
  const policy = projectNamed(gl, 'belay-policy');
  policy.protectedBranches = {
    main: { name: 'main', push_access_levels: [{ access_level: 0, access_level_description: 'No one' }], merge_access_levels: [{ access_level: 40 }], allow_force_push: false, code_owner_approval_required: true },
  };
  policy.approvalSettings = { merge_requests_author_approval: false };
  const live = liveSource(() => { throw new Error('no snapshot: the human key reads none'); }, DEMO, () => ({ port: gl.port, groupId: GROUP_ID, gitlabId: () => Promise.resolve(null) }));

  const page = async () => {
    setDataSource(live);
    const humanKey = await loadHumanKey();
    const rule = text(renderToStaticMarkup(<PromotionRule promotion={promotion} uncounted={false} proofDemo={false} humanKey={humanKey} />));
    const write = text(renderToStaticMarkup(<WriteSection head={WRITE_HEAD.promote} keyName="p" to="hands_off" view={undefined} nothing="" warn={humanKeyWarning(humanKey)} />));
    return { humanKey, rule, write };
  };

  it('in place: "Human key verified on belay-policy main", no demo chip, and the preview adds nothing', async () => {
    const { rule, write } = await page();
    expect(rule).toContain(`Precondition: ${HUMAN_KEY}.`);
    expect(rule).toContain('Human key verified on belay-policy main');
    expect(rule).not.toContain('demo');
    expect(write).not.toContain('not in place');
  });

  it('weakening the protection in the fake turns the precondition to failed, naming the setting, and the preview says so', async () => {
    policy.protectedBranches!.main!.push_access_levels = [{ access_level: 40, access_level_description: 'Maintainers' }];
    const { humanKey, rule, write } = await page();
    expect(humanKey.state).toBe('failed');
    expect(rule).toContain('Human key failed: push to belay-policy main is allowed to Maintainers (it must be No one)');
    expect(write).toContain('The human key is not in place (push to belay-policy main is allowed to Maintainers (it must be No one))');
    policy.protectedBranches!.main!.push_access_levels = [{ access_level: 0 }];
  });

  it('a read GitLab refuses, or no port yet: "Human key not read" with the reason, never verified', async () => {
    const free = createDemoGitLab(undefined, { plan: 'free' }); // approvals are Premium and up: 403
    Object.assign(projectNamed(free, 'belay-policy'), { protectedBranches: policy.protectedBranches });
    const at = (port: Parameters<typeof liveSource>[2]) => liveSource(() => { throw new Error('none'); }, DEMO, port);
    setDataSource(at(() => ({ port: free.port, groupId: GROUP_ID, gitlabId: () => Promise.resolve(null) })));
    const refused = text(renderToStaticMarkup(<PromotionRule promotion={promotion} uncounted={false} proofDemo={false} humanKey={await loadHumanKey()} />));
    expect(refused).toMatch(/Human key not read: belay-policy's approval settings \(.*403/);
    setDataSource(at(() => null));
    const none = text(renderToStaticMarkup(<PromotionRule promotion={promotion} uncounted={false} proofDemo={false} humanKey={await loadHumanKey()} />));
    expect(none).toContain('Human key not read: live mode has no GitLab port yet');
  });

  it('demo: verified, marked demo (illustrative, not read from GitLab)', async () => {
    setDataSource(demoSource);
    const k = await loadHumanKey();
    expect(k).toMatchObject({ state: 'verified', demo: true });
    const rule = renderToStaticMarkup(<PromotionRule promotion={promotion} uncounted={false} proofDemo={false} humanKey={k} />);
    expect(text(rule)).toContain('Human key verified on belay-policy main');
    expect(rule).toContain('title="Demo: illustrative, not read from GitLab"');
  });
});
