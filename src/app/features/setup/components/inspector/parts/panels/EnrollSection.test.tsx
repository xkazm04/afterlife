// The Enroll section after its policy MR is sent: a person merges it in belay-policy, so Open must always answer.
import { describe, expect, it, vi } from 'vitest';
import { EnrollSection } from '../../EnrollSection';
import { base, buttonTag, isDisabled, renderPanel } from './panelHarness';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/track-T4', useRouter: () => ({ push: () => {} }) }));

const sentPage = (url: string | null, simulated = false) => renderPanel(<EnrollSection id="T4" />, base(), { sent: { mr: '!8', url, simulated } }).html;

describe('EnrollSection: a sent policy MR', () => {
  it('names the MR to merge in belay-policy', () => {
    const html = sentPage('https://gitlab.test/mr/8');
    expect(html).toContain('Merge !8 in belay-policy');
    expect(isDisabled(buttonTag(html, 'Open !8'))).toBe(false);
  });
  it('Open stays enabled when the MR has no address, so the click can say why', () => {
    expect(isDisabled(buttonTag(sentPage(null), 'Open !8'))).toBe(false);
    expect(isDisabled(buttonTag(sentPage(null, true), 'Open !8'))).toBe(false);
  });
  it('a demo MR GitLab never named reads as simulated, as the arm section words it', () => {
    const html = renderPanel(<EnrollSection id="T4" />, base(), { sent: { mr: null, url: null, simulated: true } }).html;
    expect(html).toContain('Merge the simulated MR in belay-policy');
  });
});
