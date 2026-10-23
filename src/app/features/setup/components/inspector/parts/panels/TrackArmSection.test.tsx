// The section that decides what a person may click on a track: Arm, Disarm, Merge, Verify, or why it is Locked.
import { describe, expect, it, vi } from 'vitest';
import type { WriteView } from '@/server/actions/words';
import { TrackArmSection } from '../../TrackArmSection';
import { base, buttonTag, isDisabled, PREVIEW, renderPanel, withArm } from './panelHarness';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/track-T1', useRouter: () => ({ push: () => {} }) }));

const panel = (a: Parameters<typeof withArm>[2], view?: WriteView) =>
  renderPanel(<TrackArmSection id="T1" />, withArm(base(), 'T1', a), { view });

describe('TrackArmSection: ready asks for an Arm, nothing sent', () => {
  it('Arm waits for the planned MR, then enables; Skip is there', () => {
    const waiting = panel({ st: 'ready' }).html;
    expect(waiting).toContain('preview · nothing sent');
    expect(isDisabled(buttonTag(waiting, 'Arm · send as you'))).toBe(true);
    expect(isDisabled(buttonTag(waiting, 'Copy'))).toBe(true);
    const ready = panel({ st: 'ready' }, PREVIEW).html;
    expect(buttonTag(ready, 'Arm · send as you')).not.toBeNull();
    expect(isDisabled(buttonTag(ready, 'Arm · send as you'))).toBe(false);
    expect(buttonTag(ready, 'Skip')).not.toBeNull();
  });
  it('a refused plan keeps Arm disabled and says why', () => {
    const html = panel({ st: 'ready' }, { kind: 'refused', reason: 'main moved' }).html;
    expect(html).toContain('Belay will not plan this MR: main moved');
    expect(isDisabled(buttonTag(html, 'Arm · send as you'))).toBe(true);
  });
});

describe('TrackArmSection: armed offers the revert', () => {
  it('Disarm, one MR, no Skip', () => {
    const html = panel({ st: 'armed', found: 'T1 content on main' }, PREVIEW).html;
    expect(html).toContain('one MR · the revert');
    expect(html).toContain('Read: T1 content on main');
    expect(isDisabled(buttonTag(html, 'Disarm · send as you'))).toBe(false);
    expect(buttonTag(html, 'Skip')).toBeNull();
    expect(buttonTag(html, 'Arm · send as you')).toBeNull();
  });
});

describe('TrackArmSection: open is the person\'s merge', () => {
  it('names the MR, offers Open and verify, and a revert says so', () => {
    const html = panel({ st: 'open', mr: '!5', url: 'https://gitlab.test/mr/5', revert: true, simulated: true, found: 'not on main yet' }).html;
    expect(html).toContain('Merge !5 (revert)');
    expect(html).toContain('Belay never holds a merge token');
    expect(html).toContain('demo mode: nothing was sent to GitLab');
    expect(html).toContain('not on main yet');
    expect(isDisabled(buttonTag(html, 'Open !5'))).toBe(false);
    expect(buttonTag(html, 'I merged it · verify')).not.toBeNull();
  });
});

describe('TrackArmSection: an MR with no address still explains itself', () => {
  it('Open stays enabled when the MR has no url, so the click can say why', () => {
    for (const simulated of [true, false]) {
      expect(isDisabled(buttonTag(panel({ st: 'open', mr: '!5', url: null, simulated }).html, 'Open !5'))).toBe(false);
    }
  });
});

describe('TrackArmSection: the states with nothing to click', () => {
  it('probing shows a verify line', () => {
    expect(panel({ st: 'probing', mr: '!5' }).html).toContain('main for !5');
  });
  it('undefined and unknown say what the read found, and offer no button', () => {
    const u = panel({ st: 'undefined' }).html;
    expect(u).toContain('Not defined yet');
    expect(u).toContain("The repo does not define T1&#x27;s arm content yet");
    const k = panel({ st: 'unknown', found: 'timeout' }).html;
    expect(k).toContain('Unknown');
    expect(k).toContain('timeout');
    expect(u + k).not.toContain('<button');
  });
  it('locked names what it waits on and offers no button', () => {
    const html = panel({ st: 'locked' }).html;
    expect(html).toContain('Stays locked until a probe sees');
    expect(html).not.toContain('<button');
  });
  it('locked says what the read of main saw, as ready does (live: both come from one absent read)', () => {
    expect(panel({ st: 'locked', found: 'no T1 block on main' }).html).toContain('Read: no T1 block on main');
    expect(panel({ st: 'locked', found: null }).html).not.toContain('Read:');
  });
});
